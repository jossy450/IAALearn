// Disguise themes for making the app look like other applications
export const disguiseThemes = [
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'Looks like a Windows calculator',
    icon: 'Calculator',
    colors: {
      background: '#f2f2f2',
      primary: '#0078d4',
      text: '#000000',
      accent: '#e1e1e1'
    },
    layout: 'calculator',
    quickHideKey: 'Escape'
  },
  {
    id: 'notepad',
    name: 'Notepad',
    description: 'Plain text editor appearance',
    icon: 'FileText',
    colors: {
      background: '#ffffff',
      primary: '#000000',
      text: '#000000',
      accent: '#cccccc'
    },
    layout: 'notepad',
    quickHideKey: 'Escape'
  },
  {
    id: 'browser',
    name: 'Web Browser',
    description: 'Looks like Chrome/Edge browser',
    icon: 'Globe',
    colors: {
      background: '#ffffff',
      primary: '#1a73e8',
      text: '#202124',
      accent: '#f1f3f4'
    },
    layout: 'browser',
    quickHideKey: 'Escape'
  },
  {
    id: 'terminal',
    name: 'Terminal',
    description: 'Command line interface',
    icon: 'Terminal',
    colors: {
      background: '#0c0c0c',
      primary: '#00ff00',
      text: '#00ff00',
      accent: '#1a1a1a'
    },
    layout: 'terminal',
    quickHideKey: 'Escape'
  },
  {
    id: 'vscode',
    name: 'Code Editor',
    description: 'VS Code appearance',
    icon: 'Code',
    colors: {
      background: '#1e1e1e',
      primary: '#007acc',
      text: '#d4d4d4',
      accent: '#252526'
    },
    layout: 'ide',
    quickHideKey: 'Escape'
  },
  {
    id: 'slack',
    name: 'Slack Clone',
    description: 'Messaging app appearance',
    icon: 'MessageSquare',
    colors: {
      background: '#1a1d21',
      primary: '#1164a3',
      text: '#d1d2d3',
      accent: '#350d36'
    },
    layout: 'chat',
    quickHideKey: 'Escape'
  },
  {
    id: 'excel',
    name: 'Spreadsheet',
    description: 'Excel-like interface',
    icon: 'Table',
    colors: {
      background: '#ffffff',
      primary: '#217346',
      text: '#000000',
      accent: '#f2f2f2'
    },
    layout: 'spreadsheet',
    quickHideKey: 'Escape'
  },
  {
    id: 'pdf',
    name: 'PDF Reader',
    description: 'PDF viewer appearance',
    icon: 'FileText',
    colors: {
      background: '#525659',
      primary: '#d51007',
      text: '#ffffff',
      accent: '#323639'
    },
    layout: 'pdf',
    quickHideKey: 'Escape'
  }
];

// Decoy screens that appear when panic button is pressed
export const decoyScreens = [
  {
    id: 'google-search',
    name: 'Google Search',
    content: 'Google homepage with search results',
    url: 'https://www.google.com'
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    content: 'Programming Q&A site',
    url: 'https://stackoverflow.com'
  },
  {
    id: 'github',
    name: 'GitHub',
    content: 'Code repository',
    url: 'https://github.com'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    content: 'Professional network',
    url: 'https://www.linkedin.com'
  },
  {
    id: 'documentation',
    name: 'Technical Docs',
    content: 'Generic documentation page',
    customContent: true
  },
  {
    id: 'blank',
    name: 'Blank Screen',
    content: 'Empty white page',
    customContent: true
  }
];

// Quick hide configurations
export const quickHideOptions = {
  panicKeys: [
    { key: 'Escape', modifiers: [], label: 'ESC' },
    { key: 'b', modifiers: ['Alt'], label: 'Alt+B (Boss Key)' },
    { key: 'h', modifiers: ['Ctrl', 'Shift'], label: 'Ctrl+Shift+H' },
    { key: 'q', modifiers: ['Ctrl', 'Alt'], label: 'Ctrl+Alt+Q' },
    { key: 'F1', modifiers: [], label: 'F1' },
    { key: 'Space', modifiers: ['Ctrl', 'Shift'], label: 'Ctrl+Shift+Space' }
  ],
  hideActions: [
    { id: 'minimize', label: 'Minimize Window' },
    { id: 'decoy', label: 'Show Decoy Screen' },
    { id: 'blank', label: 'Blank Screen' },
    { id: 'close', label: 'Close App' },
    { id: 'switch-app', label: 'Switch to Another App' }
  ],
  mouseGestures: [
    { gesture: 'triple-click-top', label: 'Triple-click top-right corner' },
    { gesture: 'shake-mouse', label: 'Shake mouse rapidly' }
  ]
};

// Floating widget configurations
export const floatingWidgetOptions = {
  sizes: [
    { id: 'mini', width: 200, height: 100, label: 'Mini' },
    { id: 'small', width: 300, height: 200, label: 'Small' },
    { id: 'medium', width: 400, height: 300, label: 'Medium' }
  ],
  positions: [
    { id: 'top-right', label: 'Top Right' },
    { id: 'top-left', label: 'Top Left' },
    { id: 'bottom-right', label: 'Bottom Right' },
    { id: 'bottom-left', label: 'Bottom Left' }
  ],
  opacity: [0.3, 0.5, 0.7, 0.9, 1.0],
  styles: [
    { id: 'sticky-note', label: 'Sticky Note', icon: 'StickyNote' },
    { id: 'tooltip', label: 'Tooltip', icon: 'MessageSquare' },
    { id: 'widget', label: 'Widget', icon: 'Square' },
    { id: 'invisible', label: 'Nearly Invisible', icon: 'EyeOff' }
  ]
};

// Stealth mode features
export const stealthFeatures = {
  silentMode: {
    noSounds: true,
    noNotifications: true,
    noPopups: true,
    description: 'Completely silent operation'
  },
  minimalFootprint: {
    hideFromTaskbar: true,
    noTitleBar: true,
    transparentBackground: true,
    description: 'Minimal visual presence'
  },
  quickCopy: {
    singleClick: true,
    autoClipboard: true,
    showToast: false,
    description: 'Instant answer copying'
  },
  screenRecordingDetection: {
    enabled: true,
    alertUser: true,
    autoHide: true,
    description: 'Detect if screen is being recorded'
  },
  pictureInPicture: {
    enabled: true,
    alwaysOnTop: true,
    resizable: true,
    description: 'Floating always-on-top window'
  },
  clipboardHistory: {
    enabled: true,
    maxItems: 20,
    autoSave: true,
    description: 'Keep history of copied answers'
  }
};

// Detection evasion techniques
export const evasionTechniques = {
  screenSharing: {
    detect: true,
    method: 'Check for screen capture APIs',
    countermeasure: 'Show decoy screen or minimize'
  },
  eyeTracking: {
    detect: false,
    method: 'Simulate natural eye movement patterns',
    countermeasure: 'User should look at camera periodically'
  },
  tabSwitching: {
    detect: true,
    method: 'Monitor window focus events',
    countermeasure: 'Use picture-in-picture or mobile companion'
  },
  typing: {
    detect: false,
    method: 'Copy-paste instead of typing',
    countermeasure: 'Use clipboard, not keyboard'
  }
};

export default {
  disguiseThemes,
  decoyScreens,
  quickHideOptions,
  floatingWidgetOptions,
  stealthFeatures,
  evasionTechniques
};
