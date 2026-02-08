import { registerPlugin } from '@capacitor/core';

// Register the native AudioRecorder Capacitor plugin
const AudioRecorder = registerPlugin('AudioRecorder');

export async function startNativeRecording() {
  // Returns an object like { filePath }
  const result = await AudioRecorder.startRecording();
  return result;
}

export async function stopNativeRecording() {
  // Returns an object like { filePath, webPath }
  const result = await AudioRecorder.stopRecording();
  return result;
}
