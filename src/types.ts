export interface DeviceInfo {
  device_id: string;
  device_name: string;
  device_type: string;
  ISP_name: string;
  network_type: string;
}

export interface MetricRecord {
  timestamp: number;
  value: number;
}

export interface MetricDetail {
  unit: string;
  average_value: number;
  records: MetricRecord[];
}

export interface Metric {
  video_url: string;
  cdn_provider: string;
  time_to_first_byte: MetricDetail;
  throughput: MetricDetail;
  latency: MetricDetail;
  error_rate: MetricDetail;
  average_bitrate: MetricDetail;
  stall_rate: MetricDetail;
  upscaling_time: MetricDetail;
}

export interface MetricsPayload {
  device_info: DeviceInfo;
  metrics: Metric[];
}
