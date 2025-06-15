import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

const MIN_MEASURE_TIME = 10; // giây

interface Metrics {
    time_to_first_byte: number;
    latency: number;
    throughput: number;
    errorRate: number;
    stallCount: number;
    upscalingTime: number;
    averageBitrate: number;
    calculatingTTFB: boolean;
    calculatingThroughput: boolean;
    calculatingUpscaling: boolean;
}

const MeasurePlayer = forwardRef(function MeasurePlayer(
    {
        videoSrc,
        onRecord,
        autoRecord
    }: {
        videoSrc: string;
        onRecord?: (metrics: Metrics) => void;
        autoRecord?: boolean;
    },
    ref
) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
    const isPlaying = useRef(false);

    const upscalingStart = useRef<number | null>(null);
    const totalUpscalingTime = useRef(0);

    const latencyStart = useRef<number | null>(null);
    const latencySamples = useRef<number[]>([]);

    const metricsRef = useRef<Metrics>({
        time_to_first_byte: 0,
        latency: 0,
        throughput: 0,
        errorRate: 0,
        stallCount: 0,
        upscalingTime: 0,
        averageBitrate: 0,
        calculatingTTFB: true,
        calculatingThroughput: false,
        calculatingUpscaling: false,
    });
    
    const [_, setUiTrigger] = useState(0);
    
    const updateMetrics = (updater: (prev: Metrics) => Metrics) => {
        metricsRef.current = updater(metricsRef.current);
        setUiTrigger(prev => prev + 1);
    };

    const errorCount = useRef(0);
    const requestCount = useRef(0);
    const lastBitrateSamples = useRef<number[]>([]);
    const timeout = useRef<number | null>(null);
    const startTime = useRef<number | null>(null);
    const hasMeasuredThroughput = useRef(false);

    const measureManualTTFB = async () => {
        try {
            updateMetrics(m => ({ ...m, calculatingTTFB: true }));
            const start = performance.now();
            const response = await fetch(videoSrc, {
                method: "GET",
                cache: "no-store",
                mode: "cors",
            });
            const reader = response.body?.getReader();
            await reader?.read();
            const end = performance.now();
            const ttfb = end - start;
            reader?.cancel();
            updateMetrics(m => ({ ...m, time_to_first_byte: ttfb, calculatingTTFB: false }));
        } catch (error) {
            console.error("Error measuring TTFB:", error);
            updateMetrics(m => ({ ...m, calculatingTTFB: false }));
        }
    };

    const calculateThroughput = () => {
        const player = playerRef.current;
        if (!player || !startTime.current || hasMeasuredThroughput.current)
            return;

        const bytes =
            (player.tech({ IWillNotUseThisInPlugins: true }) as any)?.vhs?.stats
                ?.mediaBytesTransferred || 0;
        const secondsUsed = (performance.now() - startTime.current) / 1000;
        const throughputMbps = (bytes * 8) / secondsUsed / 1_000_000;

        hasMeasuredThroughput.current = true;

        updateMetrics(prev => ({
            ...prev,
            throughput: throughputMbps,
            calculatingThroughput: false,
        }));

        if (timeout.current !== null) {
            clearTimeout(timeout.current);
            timeout.current = null;
        }
    };

    const startUpscaling = () => {
        if (upscalingStart.current === null) {
            upscalingStart.current = performance.now();
            updateMetrics((m) => ({ ...m, calculatingUpscaling: true }));
        }
    };

    const stopUpscaling = () => {
        if (upscalingStart.current !== null) {
            totalUpscalingTime.current +=
                performance.now() - upscalingStart.current;
            upscalingStart.current = null;
            updateMetrics((m) => ({
                ...m,
                upscalingTime: totalUpscalingTime.current / 1000,
                calculatingUpscaling: false,
            }));
        }
    };

    const needsUpscaling = (currentWidth: number, originalWidth: number) => {
        const targetWidth = getTargetWidth(originalWidth);
        // Chỉ coi là upscaling nếu currentWidth nhỏ hơn 90% của target width
        return currentWidth < targetWidth * 0.9;
    };

    const handleEarlyStop = () => {
        if (timeout.current !== null) {
            calculateThroughput();
        }
        stopUpscaling();
        isPlaying.current = false;
    };

    useImperativeHandle(ref, () => ({
        recordMetrics: () => {
            handleEarlyStop();
            if (onRecord) onRecord(metricsRef.current);
        }
    }));

    const getTargetWidth = (originalWidth: number): number => {
        const videoElement = videoRef.current;
        if (!videoElement) return originalWidth;
        
        // Lấy kích thước thực của video element
        const elementWidth = videoElement.offsetWidth;
        // Target width sẽ là min của kích thước gốc và kích thước element
        return Math.min(originalWidth, elementWidth);
    };

    useEffect(() => {
        measureManualTTFB();
        requestAnimationFrame(() => {
            const videoElement = videoRef.current;
            if (!videoElement || playerRef.current) return;

            const player = videojs(videoElement, {
                controls: true,
                autoplay: false,
                preload: "auto",
                sources: [{ src: videoSrc, type: "application/x-mpegURL" }],
            });
            playerRef.current = player;

            player.ready(() => {
                const qualityLevels = (player as any).qualityLevels();
                let originalWidth = 0;

                const tech = player.tech({ IWillNotUseThisInPlugins: true });
                if (tech && (tech as any).vhs) {
                    const originalXhr = (tech as any).vhs.xhr;

                    (tech as any).vhs.xhr = function (options: any, callback: any) {
                        requestCount.current += 1;
                        const wrappedCallback = function (error: any, response: any) {
                            if (error || (response && response.status >= 400)) {
                                errorCount.current += 1;
                                updateMetrics(prev => ({
                                    ...prev,
                                    errorRate:
                                        (errorCount.current /
                                            requestCount.current) *
                                        100,
                                }));
                            }
                            callback?.(error, response);
                        };
                        return originalXhr.call(this, options, wrappedCallback);
                    };
                }

                player.on("play", () => {
                    isPlaying.current = true;

                    const currentLevel =
                        qualityLevels[qualityLevels.selectedIndex];
                    if (
                        currentLevel &&
                        originalWidth > 0 &&
                        needsUpscaling(currentLevel.width, originalWidth)
                    ) {
                        startUpscaling();
                    }

                    if (!hasMeasuredThroughput.current && !timeout.current) {
                        startTime.current = performance.now();
                        updateMetrics(m => ({
                            ...m,
                            calculatingThroughput: true,
                        }));
                        timeout.current = window.setTimeout(() => {
                            calculateThroughput();
                        }, MIN_MEASURE_TIME * 1000);
                    }
                });

                player.on("pause", handleEarlyStop);
                player.on("ended", () => {
                    handleEarlyStop();
                    if (autoRecord && onRecord) onRecord(metricsRef.current);
                });

                qualityLevels.on("addqualitylevel", (event: any) => {
                    const quality = event.qualityLevel;
                    if (quality.width > originalWidth) {
                        originalWidth = quality.width;
                    }
                });

                qualityLevels.on("change", () => {
                    const selectedLevel =
                        qualityLevels[qualityLevels.selectedIndex];
                    if (!selectedLevel) return;

                    lastBitrateSamples.current.push(selectedLevel.bitrate);
                    const avgBitrate =
                        lastBitrateSamples.current.reduce((a, b) => a + b, 0) /
                        lastBitrateSamples.current.length /
                        1000;

                    updateMetrics(prev => ({
                        ...prev,
                        averageBitrate: avgBitrate,
                    }));

                    if (!isPlaying.current) return;

                    if (needsUpscaling(selectedLevel.width, originalWidth)) {
                        startUpscaling();
                    } else {
                        stopUpscaling();
                    }
                });
            });

            player.on("waiting", () => {
                updateMetrics(m => ({ ...m, stallCount: m.stallCount + 1 }));
                latencyStart.current = performance.now();
            });

            player.on("playing", () => {
                if (latencyStart.current !== null) {
                    const latency = performance.now() - latencyStart.current;
                    latencySamples.current.push(latency);
                    const avgLatency =
                        latencySamples.current.reduce((a, b) => a + b, 0) /
                        latencySamples.current.length;

                    updateMetrics(m => ({ ...m, latency: avgLatency }));
                    latencyStart.current = null;
                }
            });
        });

        return () => {
            if (timeout.current) clearTimeout(timeout.current);
            playerRef.current?.dispose();
        };
    }, []);

    return (
        <div className="p-5">
            <div className="flex flex-wrap gap-8 items-start">
                <div>
                    <video
                        ref={videoRef}
                        className="video-js vjs-default-skin"
                        width={"1280px"}
                        height={"720px"}
                    />
                </div>
                <div className="min-w-[320px] flex-1">
                    <style>{`
                        .metric-label {
                            font-weight: bold;
                        }
                        .metric-value {
                            margin-left: 8px;
                        }
                        .metric-calculating {
                            color: orange;
                        }
                        .metric-done {
                            color: green;
                        }
                    `}</style>
                    <p>
                        <span className="metric-label">⚙️ TTFB:</span>
                        <span
                            className={`metric-value ${
                                metricsRef.current.calculatingTTFB
                                    ? "metric-calculating"
                                    : "metric-done"
                            }`}
                        >
                            {metricsRef.current.calculatingTTFB
                                ? "⏳ Calculating..."
                                : `${metricsRef.current.time_to_first_byte.toFixed(2)} ms`}
                        </span>
                    </p>
                    <p>
                        <span className="metric-label">📶 Throughput:</span>
                        <span
                            className={`metric-value ${
                                metricsRef.current.calculatingThroughput
                                    ? "metric-calculating"
                                    : "metric-done"
                            }`}
                        >
                            {metricsRef.current.calculatingThroughput
                                ? "⏳ Measuring..."
                                : `${metricsRef.current.throughput.toFixed(2)} Mbps`}
                        </span>
                    </p>
                    <p>
                        <span className="metric-label">🔄 Stall Count:</span>
                        <span className="metric-value">
                            {metricsRef.current.stallCount} times
                        </span>
                    </p>
                    <p>
                        <span className="metric-label">🖥️ Upscaling Time:</span>
                        <span
                            className={`metric-value ${
                                metricsRef.current.calculatingUpscaling
                                    ? "metric-calculating"
                                    : "metric-done"
                            }`}
                        >
                            {metricsRef.current.calculatingUpscaling
                                ? "⏳ Measuring..."
                                : `${metricsRef.current.upscalingTime.toFixed(2)} s`}
                        </span>
                    </p>
                    <p>
                        <span className="metric-label">📊 Average Bitrate:</span>
                        <span className="metric-value">
                            {metricsRef.current.averageBitrate.toFixed(2)} kbps
                        </span>
                    </p>
                    <p>
                        <span className="metric-label">❗ Error Rate:</span>
                        <span className="metric-value">
                            {metricsRef.current.errorRate.toFixed(2)}%
                        </span>
                    </p>
                    <p>
                        <span className="metric-label">⏱️ Latency (avg):</span>
                        <span className="metric-value">
                            {metricsRef.current.latency.toFixed(2)} ms
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
});

export default MeasurePlayer;
