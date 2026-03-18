import { Capacitor } from '@capacitor/core';

let AudioRecorderPlugin = null;

export async function startNativeRecording(options = {}) {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    console.log('Native recording not available on web');
    return { filePath: null };
  }

  try {
    if (!AudioRecorderPlugin) {
      const { registerPlugin } = await import('@capacitor/core');
      AudioRecorderPlugin = registerPlugin('AudioRecorder');
    }
    const result = await AudioRecorderPlugin.startRecording(options || {});
    return result;
  } catch (error) {
    console.warn('Native recording start failed:', error);
    return { filePath: null };
  }
}

export async function stopNativeRecording(options = {}) {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    return { filePath: null, webPath: null };
  }

  try {
    if (!AudioRecorderPlugin) {
      const { registerPlugin } = await import('@capacitor/core');
      AudioRecorderPlugin = registerPlugin('AudioRecorder');
    }
    const result = await AudioRecorderPlugin.stopRecording(options || {});
    return result;
  } catch (error) {
    console.warn('Native recording stop failed:', error);
    return { filePath: null, webPath: null };
  }
}
