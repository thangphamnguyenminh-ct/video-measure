import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import VideoMetricsLayout from './VideoMetricsLayout'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VideoMetricsLayout />
  </StrictMode>,
)
