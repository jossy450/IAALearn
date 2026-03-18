import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { User, Volume2, VolumeX, Video, VideoOff, Settings, RefreshCw } from 'lucide-react';

const AVATAR_STYLES = {
  professional: {
    name: 'Professional',
    color: '#1e3a5f',
    bgGradient: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
    description: 'Formal corporate interviewer'
  },
  friendly: {
    name: 'Friendly',
    color: '#059669',
    bgGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    description: 'Warm and approachable'
  },
  technical: {
    name: 'Technical',
    color: '#7c3aed',
    bgGradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    description: 'Deep technical questions'
  },
  behavioral: {
    name: 'Behavioral',
    color: '#dc2626',
    bgGradient: 'linear-gradient(135deg, #dc2626 0%, #f87171 100%)',
    description: 'STAR method focus'
  }
};

const AVATAR_GENDERS = {
  male: { name: 'Male', icon: '👨' },
  female: { name: 'Female', icon: '👩' },
  neutral: { name: 'Neutral', icon: '🧑' }
};

const PREMIUM_PHOTOS = {
  professional: {
    female: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
    male: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face'
  },
  friendly: {
    female: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
    male: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
  },
  technical: {
    female: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face',
    male: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face'
  },
  behavioral: {
    female: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face',
    male: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'
  }
};

const InterviewAvatar = forwardRef(({ 
  onSettingsChange, 
  isSpeaking = false, 
  currentQuestion = '',
  disabled = false,
  isPremium = false,
}, ref) => {
  const [settings, setSettings] = useState({
    style: 'professional',
    gender: 'female',
    showVideo: true,
    volume: 1,
    avatarType: 'animated'
  });
  
  const [mouthOpen, setMouthOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [imageError, setImageError] = useState(false);
  const speechSynthRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    speechSynthRef.current = window.speechSynthesis;
    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  useEffect(() => {
    if (isSpeaking && settings.showVideo) {
      setMouthOpen(true);
      const interval = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setMouthOpen(false);
    }
  }, [isSpeaking, settings.showVideo]);

  const speak = (text) => {
    if (!speechSynthRef.current || disabled) return;
    
    speechSynthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = settings.volume;
    
    const voices = speechSynthRef.current.getVoices();
    const genderVoice = settings.gender === 'female' 
      ? voices.find(v => v.name.includes('Female') || v.name.includes('Zira'))
      : voices.find(v => v.name.includes('Male') || v.name.includes('David'));
    
    if (genderVoice) {
      utterance.voice = genderVoice;
    }
    
    utterance.onstart = () => setIsActive(true);
    utterance.onend = () => setIsActive(false);
    utterance.onerror = () => setIsActive(false);
    
    speechSynthRef.current.speak(utterance);
  };

  const stop = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsActive(false);
    }
  };

  useImperativeHandle(ref, () => ({
    speak,
    stop,
    isSpeaking: () => isActive
  }));

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const currentStyle = AVATAR_STYLES[settings.style];
  const currentGender = AVATAR_GENDERS[settings.gender];
  const photoUrl = PREMIUM_PHOTOS[settings.style]?.[settings.gender];

  const renderAnimatedAvatar = () => (
    <div style={styles.avatarDisplay}>
      <div style={styles.avatarFace}>
        <div style={styles.eyesRow}>
          <div style={styles.eye}></div>
          <div style={styles.eye}></div>
        </div>
        <div 
          style={{
            ...styles.mouth,
            height: mouthOpen ? '40px' : '8px',
            borderRadius: mouthOpen ? '50%' : '20px'
          }}
        ></div>
      </div>
      
      <div style={styles.nameBadge}>
        <span style={styles.nameText}>AI Interviewer</span>
        <span style={styles.styleBadge}>{currentStyle.name}</span>
      </div>
      
      {isActive && (
        <div style={styles.speakingIndicator}>
          <div style={styles.speakingDot}></div>
          <div style={{...styles.speakingDot, animationDelay: '0.2s'}}></div>
          <div style={{...styles.speakingDot, animationDelay: '0.4s'}}></div>
        </div>
      )}
    </div>
  );

  const renderPremiumAvatar = () => (
    <div style={styles.premiumAvatarContainer}>
      {imageError ? (
        renderAnimatedAvatar()
      ) : (
        <div style={styles.photoWrapper}>
          <img 
            src={photoUrl} 
            alt="Interviewer"
            style={{
              ...styles.photoAvatar,
              opacity: isActive ? 1 : 0.95
            }}
            onError={() => setImageError(true)}
          />
          
          <svg style={styles.photoOverlay} viewBox="0 0 200 200">
            <defs>
              <clipPath id="mouthClip">
                <ellipse cx="100" cy="145" rx="25" ry={mouthOpen ? '20' : '8'} />
              </clipPath>
            </defs>
            
            <ellipse 
              cx="100" 
              cy="145" 
              rx={mouthOpen ? '28' : '22'} 
              ry={mouthOpen ? '22' : '6'} 
              fill="#2a1f1f"
              opacity="0.9"
            />
            
            {isActive && (
              <g>
                <circle cx="100" cy="130" r="8" fill="#4a3f3f" opacity="0.3">
                  <animate attributeName="opacity" values="0.3;0.6;0.3" dur="0.3s" repeatCount="indefinite" />
                </circle>
              </g>
            )}
          </svg>

          <div style={styles.photoBadge}>
            <span style={styles.photoBadgeText}>Premium</span>
          </div>

          {isActive && (
            <div style={styles.premiumSpeakingRing}>
              <div style={styles.premiumPulse1}></div>
              <div style={styles.premiumPulse2}></div>
            </div>
          )}
        </div>
      )}
      
      <div style={styles.photoInfo}>
        <span style={styles.photoName}>{currentStyle.name} Interviewer</span>
        <span style={styles.photoDesc}>{currentStyle.description}</span>
      </div>
    </div>
  );

  return (
    <div className="avatar-container" style={styles.container}>
      <div style={styles.avatarWrapper}>
        <div 
          style={{
            ...styles.avatarFrame,
            background: settings.showVideo 
              ? (isPremium && settings.avatarType === 'premium' 
                  ? `url(${photoUrl}) center/cover no-repeat, linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)` 
                  : currentStyle.bgGradient)
              : '#374151'
          }}
        >
          {settings.showVideo ? (
            isPremium && settings.avatarType === 'premium' ? (
              renderPremiumAvatar()
            ) : (
              renderAnimatedAvatar()
            )
          ) : (
            <div style={styles.videoOffDisplay}>
              <VideoOff size={48} color="#9ca3af" />
              <span style={styles.videoOffText}>Video Disabled</span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.settingsPanel}>
        {isPremium && (
          <div style={styles.settingGroup}>
            <label style={styles.settingLabel}>
              <Video size={16} /> Avatar Type
            </label>
            <div style={styles.typeOptions}>
              <button
                onClick={() => updateSetting('avatarType', 'animated')}
                style={{
                  ...styles.typeBtn,
                  ...(settings.avatarType === 'animated' ? styles.typeBtnActive : {})
                }}
              >
                Animated
              </button>
              <button
                onClick={() => updateSetting('avatarType', 'premium')}
                style={{
                  ...styles.typeBtn,
                  ...(settings.avatarType === 'premium' ? styles.typeBtnActive : {}),
                  borderColor: '#f59e0b'
                }}
              >
                <span style={{color: '#f59e0b'}}>⭐ Premium</span>
              </button>
            </div>
          </div>
        )}

        <div style={styles.settingGroup}>
          <label style={styles.settingLabel}>
            <User size={16} /> Interviewer Style
          </label>
          <div style={styles.styleOptions}>
            {Object.entries(AVATAR_STYLES).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  updateSetting('style', key);
                  setImageError(false);
                }}
                style={{
                  ...styles.styleBtn,
                  ...(settings.style === key ? styles.styleBtnActive : {}),
                  borderColor: value.color
                }}
              >
                <span style={{color: value.color}}>{value.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.settingGroup}>
          <label style={styles.settingLabel}>
            <span style={{fontSize: '16px'}}>{currentGender.icon}</span> Voice
          </label>
          <div style={styles.genderOptions}>
            {Object.entries(AVATAR_GENDERS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  updateSetting('gender', key);
                  setImageError(false);
                }}
                style={{
                  ...styles.genderBtn,
                  ...(settings.gender === key ? styles.genderBtnActive : {})
                }}
              >
                {value.icon} {value.name}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.settingRow}>
          <button 
            onClick={() => updateSetting('showVideo', !settings.showVideo)}
            style={{
              ...styles.toggleBtn,
              ...(settings.showVideo ? styles.toggleBtnActive : {})
            }}
          >
            {settings.showVideo ? <Video size={16} /> : <VideoOff size={16} />}
            {settings.showVideo ? 'Video On' : 'Video Off'}
          </button>
          
          <button 
            onClick={() => updateSetting('volume', settings.volume === 1 ? 0 : 1)}
            style={styles.toggleBtn}
          >
            {settings.volume === 1 ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
});

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    background: '#1f2937',
    borderRadius: '12px',
    maxWidth: '340px'
  },
  avatarWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px'
  },
  avatarFrame: {
    width: '220px',
    height: '220px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    position: 'relative'
  },
  avatarDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  avatarFace: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px'
  },
  eyesRow: {
    display: 'flex',
    gap: '24px'
  },
  eye: {
    width: '24px',
    height: '24px',
    background: 'white',
    borderRadius: '50%',
    position: 'relative'
  },
  mouth: {
    width: '48px',
    background: '#1f2937',
    transition: 'all 0.1s ease',
    border: '2px solid white'
  },
  nameBadge: {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)',
    padding: '4px 12px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px'
  },
  nameText: {
    color: 'white',
    fontSize: '12px',
    fontWeight: '600'
  },
  styleBadge: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '10px'
  },
  speakingIndicator: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    display: 'flex',
    gap: '4px',
    background: 'rgba(0,0,0,0.5)',
    padding: '6px 10px',
    borderRadius: '20px'
  },
  speakingDot: {
    width: '6px',
    height: '6px',
    background: '#10b981',
    borderRadius: '50%',
    animation: 'pulse 0.5s ease-in-out infinite'
  },
  videoOffDisplay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  },
  videoOffText: {
    color: '#9ca3af',
    fontSize: '14px'
  },
  
  premiumAvatarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    height: '100%'
  },
  photoWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoAvatar: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease'
  },
  photoOverlay: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60px',
    height: '50px'
  },
  photoBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    padding: '4px 10px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
  },
  photoBadgeText: {
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.5px'
  },
  photoInfo: {
    position: 'absolute',
    bottom: '8px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.75)',
    padding: '6px 14px',
    borderRadius: '16px',
    gap: '2px'
  },
  photoName: {
    color: 'white',
    fontSize: '11px',
    fontWeight: '600'
  },
  photoDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '9px'
  },
  premiumSpeakingRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '180px',
    height: '180px',
    borderRadius: '50%',
    border: '3px solid rgba(245, 158, 11, 0.5)',
    pointerEvents: 'none'
  },
  premiumPulse1: {
    position: 'absolute',
    top: '-10px',
    left: '-10px',
    right: '-10px',
    bottom: '-10px',
    borderRadius: '50%',
    border: '2px solid #f59e0b',
    animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
    opacity: 0
  },
  premiumPulse2: {
    position: 'absolute',
    top: '-10px',
    left: '-10px',
    right: '-10px',
    bottom: '-10px',
    borderRadius: '50%',
    border: '2px solid #f59e0b',
    animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
    animationDelay: '0.5s',
    opacity: 0
  },

  settingsPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #374151'
  },
  settingGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  settingLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#9ca3af',
    fontSize: '12px',
    fontWeight: '500'
  },
  typeOptions: {
    display: 'flex',
    gap: '8px'
  },
  typeBtn: {
    flex: 1,
    padding: '8px 12px',
    background: '#374151',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  typeBtnActive: {
    background: '#4b5563',
    borderColor: '#3b82f6'
  },
  styleOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px'
  },
  styleBtn: {
    padding: '8px 12px',
    background: '#374151',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  styleBtnActive: {
    background: '#4b5563',
    borderColor: 'currentColor'
  },
  genderOptions: {
    display: 'flex',
    gap: '6px'
  },
  genderBtn: {
    flex: 1,
    padding: '8px',
    background: '#374151',
    border: '2px solid transparent',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  genderBtnActive: {
    background: '#4b5563',
    borderColor: '#3b82f6'
  },
  settingRow: {
    display: 'flex',
    gap: '8px'
  },
  toggleBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    background: '#374151',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleBtnActive: {
    background: '#3b82f6'
  }
};

InterviewAvatar.displayName = 'InterviewAvatar';

export default InterviewAvatar;
export { AVATAR_STYLES, AVATAR_GENDERS };
