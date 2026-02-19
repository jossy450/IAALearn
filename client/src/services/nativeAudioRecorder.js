import { registerPlugin } from '@capacitor/core';

// Register the native AudioRecorder Capacitor plugin
const AudioRecorder = registerPlugin('AudioRecorder');

export async function startNativeRecording(options = {}) {
  // Returns an object like { filePath }
  const result = await AudioRecorder.startRecording(options || {});
  return result;
}

export async function stopNativeRecording(options = {}) {
  // Returns an object like { filePath, webPath }
  const result = await AudioRecorder.stopRecording(options || {});
  return result;
}
