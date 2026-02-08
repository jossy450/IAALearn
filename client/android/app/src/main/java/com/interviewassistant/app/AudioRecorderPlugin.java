package com.interviewassistant.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.MediaRecorder;
import android.net.Uri;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.IOException;

@CapacitorPlugin(name = "AudioRecorder")
public class AudioRecorderPlugin extends Plugin {
  private MediaRecorder recorder;
  private String currentFilePath;

  @PluginMethod
  public void startRecording(PluginCall call) {
    Bridge bridge = getBridge();
    if (bridge == null || bridge.getActivity() == null) {
      call.reject("No activity available");
      return;
    }

    if (ContextCompat.checkSelfPermission(bridge.getActivity(), Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(bridge.getActivity(), new String[]{Manifest.permission.RECORD_AUDIO}, 9001);
      call.reject("RECORD_AUDIO permission not granted");
      return;
    }

    try {
      stopInternal();

      // Saving to cache directory is often more compatible with Filesystem plugin and cleaner for temp files
      File dir = bridge.getContext().getCacheDir();
      if (dir == null) {
        call.reject("No cache dir available");
        return;
      }

      File outFile = new File(dir, "temp_recording.m4a");

      recorder = new MediaRecorder();
      recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
      recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
      recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
      recorder.setAudioEncodingBitRate(128000);
      recorder.setAudioSamplingRate(44100);
      recorder.setOutputFile(outFile.getAbsolutePath());

      recorder.prepare();
      recorder.start();

      currentFilePath = outFile.getAbsolutePath();

      JSObject ret = new JSObject();
      ret.put("filePath", currentFilePath);
      call.resolve(ret);
    } catch (IOException e) {
      call.reject("Failed to start recording: " + e.getMessage(), e);
    }
  }

  @PluginMethod
  public void stopRecording(PluginCall call) {
    try {
      stopInternal();
      
      JSObject ret = new JSObject();
      ret.put("filePath", currentFilePath);
      
      if (currentFilePath != null) {
          String scheme = getBridge().getScheme();
          String host = getBridge().getHost();
          String webPath = scheme + "://" + host + "/_capacitor_file_" + currentFilePath;
          ret.put("webPath", webPath);
          ret.put("mimeType", "audio/mp4");
          
          // Also return the filename for easier relative access if needed
          ret.put("fileName", new File(currentFilePath).getName());
      }

      call.resolve(ret);
    } catch (Exception e) {
      call.reject("Failed to stop recording: " + e.getMessage(), e);
    }
  }

  private void stopInternal() {
    if (recorder != null) {
      try {
        recorder.stop();
      } catch (RuntimeException ignored) {
      }
      recorder.reset();
      recorder.release();
      recorder = null;
    }
  }
}
