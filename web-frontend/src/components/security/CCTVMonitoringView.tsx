import React, { useState } from 'react';
import {
  Video,
  Camera,
  ShieldCheck,
  AlertTriangle,
  Maximize2,
  Volume2,
  Moon,
  Sun,
  Radio,
  Eye,
  Lock,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const CCTVMonitoringView: React.FC = () => {
  const { cctvCameras, addToast } = useApp();
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [nightVision, setNightVision] = useState(false);
  const [viewLayout, setViewLayout] = useState<'GRID' | 'SINGLE'>('GRID');

  const activeCamera = cctvCameras.find((c) => c.id === selectedCameraId) || cctvCameras[0];

  const handleSnapshot = (camName: string) => {
    addToast({
      type: 'success',
      title: 'Surveillance Snapshot Saved',
      message: `Captured frame from ${camName} to security archive.`
    });
  };

  const handleAnnouncement = (bayName: string) => {
    addToast({
      type: 'info',
      title: 'Workshop PA Broadcast',
      message: `Audio alert transmitted to ${bayName} speaker.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Workshop CCTV & Security Monitoring</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-mono font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              {cctvCameras.filter((c) => c.status === 'ONLINE').length} / {cctvCameras.length} Live Feeds
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Real-time bay monitoring, customer lounge safety, entrance gate telemetry, and recording archives.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNightVision(!nightVision)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
              nightVision ? 'bg-indigo-900 text-white border-indigo-700' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {nightVision ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>{nightVision ? 'IR Night Vision ON' : 'Standard Color'}</span>
          </button>

          <button
            onClick={() => setViewLayout(viewLayout === 'GRID' ? 'SINGLE' : 'GRID')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            <span>{viewLayout === 'GRID' ? 'Single Camera View' : 'Quad Grid Wall'}</span>
          </button>
        </div>
      </div>

      {/* Camera Grid View */}
      {viewLayout === 'GRID' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cctvCameras.map((cam) => (
            <div
              key={cam.id}
              className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-md flex flex-col justify-between group"
            >
              {/* Camera Header Banner */}
              <div className="p-3 bg-slate-900/90 flex items-center justify-between text-xs text-white border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      cam.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="font-bold text-xs">{cam.name}</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{cam.bayAssigned}</span>
              </div>

              {/* Video Stream Simulation */}
              <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                <img
                  src={cam.streamUrl}
                  alt={cam.name}
                  className={`w-full h-full object-cover transition-all ${
                    nightVision ? 'grayscale contrast-125 brightness-110' : 'opacity-90 group-hover:scale-105'
                  }`}
                />

                {/* Overlays */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400">
                  REC ● {new Date().toLocaleTimeString()}
                </div>

                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                  {cam.resolution} • {cam.fps}fps
                </div>

                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-white">
                  CAM-{cam.id.toUpperCase()}
                </div>
              </div>

              {/* Camera Quick Bar */}
              <div className="p-2.5 bg-slate-900 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
                <button
                  onClick={() => {
                    setSelectedCameraId(cam.id);
                    setViewLayout('SINGLE');
                  }}
                  className="hover:text-blue-400 font-bold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Stream</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAnnouncement(cam.bayAssigned)}
                    className="p-1.5 hover:text-white rounded hover:bg-slate-800"
                    title="Workshop PA Audio"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleSnapshot(cam.name)}
                    className="p-1.5 hover:text-white rounded hover:bg-slate-800"
                    title="Take Snapshot"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Single Camera High-Res View */
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-lg font-bold">{activeCamera.name} ({activeCamera.bayAssigned})</h3>
                <p className="text-xs text-slate-400 font-mono">Stream: CAM-{activeCamera.id.toUpperCase()} • 1080P 60FPS High Bitrate</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSnapshot(activeCamera.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
              >
                <Camera className="w-4 h-4" />
                <span>Save Frame</span>
              </button>
              <button
                onClick={() => handleAnnouncement(activeCamera.bayAssigned)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
              >
                <Volume2 className="w-4 h-4" />
                <span>Broadcast to Bay</span>
              </button>
            </div>
          </div>

          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800">
            <img
              src={activeCamera.streamUrl}
              alt=""
              className={`w-full h-full object-cover ${nightVision ? 'grayscale contrast-125 brightness-110' : ''}`}
            />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs px-3 py-1 rounded-lg text-xs font-mono text-emerald-400">
              LIVE BROADCAST ● {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* Camera Picker Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {cctvCameras.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCameraId(c.id)}
                className={`p-3 rounded-xl border text-left transition-all text-xs ${
                  activeCamera.id === c.id
                    ? 'bg-blue-950/80 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <span className="font-bold block truncate text-slate-200">{c.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">{c.bayAssigned}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
