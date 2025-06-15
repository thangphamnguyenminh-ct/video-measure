import type { Metric } from "./types";

export const defaultVideoUrlByFile = [
  {
    file: "File 1",
    videos: [
      {
        video_url: "https://customer-xk3d5dkkzdz1mqv1.cloudflarestream.com/4599f020456342adbacdb4c339c88b52/manifest/video.m3u8",
        cdn_provider: "Cloudflare"
      },
      {
        video_url: "https://chotot.vncdn.vn/transcode/1047331/1/3/639/manifest.m3u8",
        cdn_provider: "VNetwork"
      },
      {
        video_url: "https://hcm04.vstorage.vngcloud.vn/cdn-transcode/sigma-vod/7542102f-43c7-48d9-a60c-2b45b96834be/hls/master.m3u8",
        cdn_provider: "VNG"
      },
      {
        video_url: "https://byteplus.chotot.org/86064025065a4efa85582ff23be2bf2d/master.m3u8",
        cdn_provider: "Byteplus"
      }
    ]
  },
  {
    file: "File 2",
    videos: [
      {
        video_url: "https://customer-xk3d5dkkzdz1mqv1.cloudflarestream.com/641996ac8bda43f59b83b4a16bb27548/manifest/video.m3u8",
        cdn_provider: "Cloudflare"
      },
      {
        video_url: "https://chotot.vncdn.vn/transcode/1047327/1/3/639/manifest.m3u8",
        cdn_provider: "VNetwork"
      },
      {
        video_url: "https://hcm04.vstorage.vngcloud.vn/cdn-transcode/sigma-vod/40af6c4d-1906-44ce-be3e-df4be488c33e/hls/master.m3u8",
        cdn_provider: "VNG"
      },
      {
        video_url: "https://byteplus.chotot.org/55235eb9bba74c059d809e50479cc67a/master.m3u8",
        cdn_provider: "Byteplus"
      }
    ]
  },
  {
    file: "File 3",
    videos: [
      {
        video_url: "https://customer-xk3d5dkkzdz1mqv1.cloudflarestream.com/244402d18fb540f0aeb02d101d7d8b4f/manifest/video.m3u8",
        cdn_provider: "Cloudflare"
      },
      {
        video_url: "https://chotot.vncdn.vn/transcode/1047330/1/3/639/manifest.m3u8",
        cdn_provider: "VNetwork"
      },
      {
        video_url: "https://hcm04.vstorage.vngcloud.vn/cdn-transcode/sigma-vod/d1bcf123-c677-49aa-b327-5f24eb087e99/hls/master.m3u8",
        cdn_provider: "VNG"
      },
      {
        video_url: "https://byteplus.chotot.org/a2b15d08d8b24e85845d3e88f47bf5c9/master.m3u8",
        cdn_provider: "Byteplus"
      }
    ]
  },
  {
    file: "File 4",
    videos: [
      {
        video_url: "https://customer-xk3d5dkkzdz1mqv1.cloudflarestream.com/cc7221c60408489991e584377ce085b7/manifest/video.m3u8",
        cdn_provider: "Cloudflare"
      },
      {
        video_url: "https://chotot.vncdn.vn/transcode/1047329/1/3/639/manifest.m3u8",
        cdn_provider: "VNetwork"
      },
      {
        video_url: "https://hcm04.vstorage.vngcloud.vn/cdn-transcode/sigma-vod/436e51cc-05e1-4d41-ba1d-3a2234b1b058/hls/master.m3u8",
        cdn_provider: "VNG"
      },
      {
        video_url: "https://byteplus.chotot.org/02fe5d53562e49c694ffb8b7a95972c2/master.m3u8",
        cdn_provider: "Byteplus"
      }
    ]
  },
  {
    file: "File 5",
    videos: [
      {
        video_url: "https://customer-xk3d5dkkzdz1mqv1.cloudflarestream.com/95bfd6ac96304d61a757983d7788ae16/manifest/video.m3u8",
        cdn_provider: "Cloudflare"
      },
      {
        video_url: "https://chotot.vncdn.vn/transcode/1047328/1/3/639/manifest.m3u8",
        cdn_provider: "VNetwork"
      },
      {
        video_url: "https://hcm04.vstorage.vngcloud.vn/cdn-transcode/sigma-vod/ece0b915-5746-4100-ab3b-73a2b14a594d/hls/master.m3u8",
        cdn_provider: "VNG"
      },
      {
        video_url: "https://byteplus.chotot.org/7be222dbb0aa486db49510e96e431cae/master.m3u8",
        cdn_provider: "Byteplus"
      }
    ]
  }
];

interface VideoMetricsManagerProps {
  metrics: Metric[];
  setMetrics: React.Dispatch<React.SetStateAction<Metric[]>>;
  selectedUrl: string | null;
  setSelectedUrl: (url: string) => void;
}

const VideoMetricsManager: React.FC<VideoMetricsManagerProps> = ({
  metrics,
  setMetrics,
  selectedUrl,
  setSelectedUrl,
}) => {
  const selectedMetric = metrics.find(m => m.video_url === selectedUrl);
  const metricKeys = selectedMetric ? Object.entries(selectedMetric)
    .filter(([key]) => key !== 'video_url' && key !== 'cdn_provider') : [];
  const maxRecords = Math.max(
    ...metricKeys.map(([_, val]) => val.records.length)
  );

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🎥 Video Metrics Manager</h1>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <select
          value={selectedUrl || ''}
          onChange={e => setSelectedUrl(e.target.value)}
          className="border border-gray-300 rounded px-5 py-4 min-w-[400px] text-lg h-14 cursor-pointer focus:ring-2 focus:ring-blue-400"
          style={{ fontSize: 20, paddingLeft: 24, height: 56 }}
        >
          {defaultVideoUrlByFile.map(group => [
            <option key={group.file} value={group.file} disabled style={{ fontWeight: 'bold', background: '#f3f4f6', fontSize: 18, padding: '12px 16px' }}>{group.file}</option>,
            ...group.videos.map(video => (
              <option key={video.video_url} value={video.video_url} style={{ paddingLeft: 40, fontSize: 18, padding: '12px 16px' }}>
                {video.cdn_provider} - {video.video_url}
              </option>
            ))
          ])}
        </select>
      </div>

      {selectedMetric && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!selectedUrl) return;
                setMetrics(prev => prev.map(m => m.video_url === selectedUrl ? {
                  ...m,
                  time_to_first_byte: { ...m.time_to_first_byte, average_value: 0, records: [] },
                  throughput: { ...m.throughput, average_value: 0, records: [] },
                  latency: { ...m.latency, average_value: 0, records: [] },
                  error_rate: { ...m.error_rate, average_value: 0, records: [] },
                  average_bitrate: { ...m.average_bitrate, average_value: 0, records: [] },
                  stall_rate: { ...m.stall_rate, average_value: 0, records: [] },
                  upscaling_time: { ...m.upscaling_time, average_value: 0, records: [] },
                } : m));
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >Reset Selected Metrics</button>
            <button
              onClick={() => setMetrics(prev => prev.map(m => ({
                ...m,
                time_to_first_byte: { ...m.time_to_first_byte, average_value: 0, records: [] },
                throughput: { ...m.throughput, average_value: 0, records: [] },
                latency: { ...m.latency, average_value: 0, records: [] },
                error_rate: { ...m.error_rate, average_value: 0, records: [] },
                average_bitrate: { ...m.average_bitrate, average_value: 0, records: [] },
                stall_rate: { ...m.stall_rate, average_value: 0, records: [] },
                upscaling_time: { ...m.upscaling_time, average_value: 0, records: [] },
              })))}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >Reset All Metrics</button>
          </div>

          <div className="overflow-auto">
            <table className="table-auto border-collapse w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-100">
                  {metricKeys.map(([key, val]) => (
                    <th key={key} className="border px-4 py-2">
                      {key} <br />
                      <span className="text-gray-500 text-xs">
                        Avg: {val.average_value.toFixed(2)} {val.unit}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(maxRecords)].map((_, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {metricKeys.map(([key, val]) => (
                      <td key={`${key}-${rowIndex}`} className="border px-4 py-2">
                        {val.records[rowIndex] ? `${val.records[rowIndex].value.toFixed(2)}` : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoMetricsManager;