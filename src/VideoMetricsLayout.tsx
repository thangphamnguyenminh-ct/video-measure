import { useEffect, useRef, useState } from "react";
import MeasurePlayer from "./MeasurePlayer";
import VideoMetricsManager from "./Table";
import type { Metric, MetricDetail, MetricsPayload } from "./types";
import { getDeviceInfo } from "./helper";

// Helper: convert raw metrics from MeasurePlayer to MetricDetail
function appendMetricDetail(
  old: MetricDetail,
  value: number
): MetricDetail {
  const now = Date.now();
  const records = [...old.records, { timestamp: now, value }];
  const average_value = records.reduce((sum, r) => sum + r.value, 0) / records.length;
  return { ...old, records, average_value };
}

import { defaultVideoUrlByFile } from './Table';

export default function VideoMetricsLayout() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string>(
    'https://customer-xk3d5dkkzdz1mqv1.cloudflarestream.com/4599f020456342adbacdb4c339c88b52/manifest/video.m3u8'
  );
  const [autoRecord, setAutoRecord] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const playerRef = useRef<any>(null);

  // Helper to find CDN provider from defaultVideoUrlByFile
  function findCdnProvider(url: string): string {
    for (const group of defaultVideoUrlByFile) {
      const video = group.videos.find((v: { video_url: string; cdn_provider: string }) => v.video_url === url);
      if (video) return video.cdn_provider;
    }
    return "Unknown";
  }

  // Find or create metric for current video
  function getOrCreateMetric(url: string): Metric {
    const found = metrics.find((m) => m.video_url === url);
    if (found) return found;
    return {
      video_url: url,
      cdn_provider: findCdnProvider(url),
      time_to_first_byte: { unit: "ms", average_value: 0, records: [] },
      throughput: { unit: "mbps", average_value: 0, records: [] },
      latency: { unit: "ms", average_value: 0, records: [] },
      error_rate: { unit: "%", average_value: 0, records: [] },
      average_bitrate: { unit: "kbps", average_value: 0, records: [] },
      stall_rate: { unit: "time", average_value: 0, records: [] },
      upscaling_time: { unit: "second", average_value: 0, records: [] },
    };
  }

  // Callback to record metrics from MeasurePlayer
  function handleRecord(raw: any) {
    setMetrics((prev) => {
      const idx = prev.findIndex((m) => m.video_url === selectedUrl);
      const old = idx >= 0 ? prev[idx] : getOrCreateMetric(selectedUrl);
      const updated: Metric = {
        ...old,
        time_to_first_byte: appendMetricDetail(old.time_to_first_byte, raw.time_to_first_byte),
        throughput: appendMetricDetail(old.throughput, raw.throughput),
        latency: appendMetricDetail(old.latency, raw.latency),
        error_rate: appendMetricDetail(old.error_rate, raw.errorRate),
        average_bitrate: appendMetricDetail(old.average_bitrate, raw.averageBitrate),
        stall_rate: appendMetricDetail(old.stall_rate, raw.stallCount),
        upscaling_time: appendMetricDetail(old.upscaling_time, raw.upscalingTime),
      };
      if (idx >= 0) {
        return prev.map((m, i) => (i === idx ? updated : m));
      } else {
        return [...prev, updated];
      }
    });
    setPlayerCount(c => c + 1); // remount player sau mỗi lần record
  }

  const handleExportReport = async () => {
    try {
      const deviceInfo = await getDeviceInfo();
      const report: MetricsPayload = {
        device_info: deviceInfo,
        metrics: metrics
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `metrics-report-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report');
    }
  };

  useEffect(() => {
    console.log("Metrics updated:", metrics);
  }, [metrics])

  return (
    <div className="flex flex-col gap-8 max-w-screen-xl mx-auto p-6">
      <div style={{ padding: 24, borderRadius: 12, background: '#f9fafb', boxShadow: '0 2px 8px #0001' }}>
        <MeasurePlayer
          key={selectedUrl + '-' + playerCount}
          ref={playerRef}
          videoSrc={selectedUrl}
          onRecord={handleRecord}
          autoRecord={autoRecord}
        />
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
          <div className="flex items-center gap-4">
          <button
            style={{ padding: '10px 24px', borderRadius: 8, background: '#2563eb', color: 'white', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer' }}
            onClick={() => playerRef.current?.recordMetrics?.()}
          >Record</button>
          <button
            style={{ padding: '10px 24px', borderRadius: 8, background: '#059669', color: 'white', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer' }}
            onClick={handleExportReport}
          >Export Report</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, padding: '8px 0' }}>
            <input type="checkbox" checked={autoRecord} onChange={e => setAutoRecord(e.target.checked)} style={{ width: 18, height: 18 }} />
            Auto Record
          </label>
        </div>
        </div>
      </div>
      <div style={{ padding: 24, borderRadius: 12, background: '#fff', boxShadow: '0 2px 8px #0001' }}>
        <VideoMetricsManager
          metrics={metrics}
          setMetrics={setMetrics}
          selectedUrl={selectedUrl}
          setSelectedUrl={setSelectedUrl}
        />
      </div>
    </div>
  );
}
