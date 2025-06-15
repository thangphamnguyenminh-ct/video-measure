import { v4 as uuidv4 } from "uuid";
import { UAParser } from "ua-parser-js";
const IPINFO_TOKEN = "e14763c67202df";
export async function getDeviceInfo(): Promise<{
  device_id: string;
  device_name: string;
  device_type: string;
  ISP_name: string;
  network_type: string;
}> {
  // 1. Device ID
  let device_id = localStorage.getItem("device_id");
  if (!device_id) {
    device_id = uuidv4();
    localStorage.setItem("device_id", device_id);
  }

  // 2. Device Name & Type
  const parser = new UAParser();
  const result = parser.getResult();

  const device_name = result.device.model
    ? `${result.device.vendor || "Unknown"} ${result.device.model}`
    : `${result.browser.name || "Browser"} on ${
        result.os.name || "Unknown OS"
      }`;

  const device_type =
    result.device.type || result.os.name?.toLowerCase() || "unknown";

  // 3. Network Type
  let network_type = "WIFI";

  // 4. ISP Name
  let ISP_name = "unknown";
  try {
    const res = await fetch(`https://ipinfo.io/json?token=${IPINFO_TOKEN}`);
    const data = await res.json();
    ISP_name = data.org || "unknown";
  } catch (err) {
    console.warn("Could not fetch ISP info:", err);
  }

  return {
    device_id,
    device_name,
    device_type,
    ISP_name,
    network_type,
  };
}
