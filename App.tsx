
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PowerCalculation, AISSSetting } from './types';
import { CT_VALUES, PT_RATIO, MAX_TR_MULTIPLIER, AISS_CONFIG_TABLE } from './constants';

const App: React.FC = () => {
  const [inputDigits, setInputDigits] = useState<string[]>(() => {
    const saved = localStorage.getItem('last_input_digits');
    return saved ? JSON.parse(saved) : ['0', '0', '0', '0'];
  });
  const [isActive, setIsActive] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false); 
  const [osType, setOsType] = useState<'android' | 'ios' | 'unknown'>('unknown');
  const [isScrolling, setIsScrolling] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(() => {
    const saved = localStorage.getItem('selected_index');
    return saved !== null ? parseInt(saved, 10) : 2;
  });
  const [aissPopup, setAissPopup] = useState<AISSSetting | null>(null);
  const [lastInputTime, setLastInputTime] = useState(0);
  
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const timerRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const backLongPressTimerRef = useRef<number | null>(null);
  const itemLongPressTimerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf("android") > -1) setOsType('android');
    else if (ua.indexOf("iphone") > -1 || ua.indexOf("ipad") > -1) setOsType('ios');
    
    initCamera();
  }, []);

  useEffect(() => {
    localStorage.setItem('selected_index', selectedRowIndex.toString());
  }, [selectedRowIndex]);

  useEffect(() => {
    localStorage.setItem('last_input_digits', JSON.stringify(inputDigits));
    setLastInputTime(Date.now());
  }, [inputDigits]);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimerRef.current) window.clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => setIsScrolling(false), 1000);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const toggleFlash = async (state?: boolean) => {
    const newState = state !== undefined ? state : !isFlashOn;
    if (hasFlash && videoTrackRef.current) {
      try {
        await videoTrackRef.current.applyConstraints({ advanced: [{ torch: newState }] } as any);
      } catch (err) {
        console.error("Flash error:", err);
      }
    } 
    setIsFlashOn(newState);
    if ('vibrate' in navigator) navigator.vibrate(newState ? [30, 10, 30] : 20);
  };

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
      if (capabilities && capabilities.torch) {
        setHasFlash(true);
        videoTrackRef.current = track;
      } else {
        setHasFlash(false);
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (err) {
      setHasFlash(false);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isFlashOn) toggleFlash(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (videoTrackRef.current) {
        videoTrackRef.current.applyConstraints({ advanced: [{ torch: false }] } as any);
        videoTrackRef.current.stop();
      }
    };
  }, [isFlashOn]);

  const resetTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIsActive(true);
    timerRef.current = window.setTimeout(() => setIsActive(false), 2000);
  };

  const handleKeyPress = (key: string) => {
    resetTimer();
    if ('vibrate' in navigator) navigator.vibrate(12);
    
    if (key === 'FLASH') {
      toggleFlash();
      return;
    }
    if (key === 'BACK') {
      setInputDigits(prev => ['0', prev[0], prev[1], prev[2]]);
      return;
    }
    if (key === 'CLEAR_ALL') {
      setInputDigits(['0', '0', '0', '0']);
      if ('vibrate' in navigator) navigator.vibrate([50, 30, 50]);
      return;
    }
    setInputDigits(prev => {
      if (!isActive) return ['0', '0', '0', key];
      return [prev[1], prev[2], prev[3], key];
    });
  };

  const onBackStart = () => {
    backLongPressTimerRef.current = window.setTimeout(() => {
      handleKeyPress('CLEAR_ALL');
      backLongPressTimerRef.current = null;
    }, 600);
  };

  const onBackEnd = () => {
    if (backLongPressTimerRef.current) {
      window.clearTimeout(backLongPressTimerRef.current);
      backLongPressTimerRef.current = null;
      handleKeyPress('BACK');
    }
  };

  const onItemPressStart = (row: PowerCalculation, idx: number) => {
    itemLongPressTimerRef.current = window.setTimeout(() => {
      const config = AISS_CONFIG_TABLE.find(c => row.maxTR <= c.limit) || AISS_CONFIG_TABLE[AISS_CONFIG_TABLE.length - 1];
      setAissPopup({
        ct: row.ct,
        maxTR: row.maxTR,
        phaseCurrent: config.phase,
        groundCurrent: config.ground,
        timeDelay: config.delay
      });
      if ('vibrate' in navigator) navigator.vibrate(40);
      itemLongPressTimerRef.current = null;
    }, 600);
  };

  const onItemPressEnd = (idx: number) => {
    if (itemLongPressTimerRef.current) {
      window.clearTimeout(itemLongPressTimerRef.current);
      itemLongPressTimerRef.current = null;
      setSelectedRowIndex(idx);
      if ('vibrate' in navigator) navigator.vibrate(10);
    }
  };

  const formatValue = (digits: string[]) => `${digits[0]}.${digits[1]}${digits[2]}${digits[3]}`;
  const displayValue = formatValue(inputDigits);

  const calculatePowerData = (val: string): PowerCalculation[] => {
    const numericVal = parseFloat(val) || 0;
    return CT_VALUES.map(ct => {
      const mof = PT_RATIO * (ct / 5);
      const peak = numericVal * mof;
      const maxTR = Math.round(ct * MAX_TR_MULTIPLIER);
      return {
        maxTR,
        ct,
        mof,
        peakPower: peak === 0 ? "0" : peak.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      };
    });
  };

  const powerData = calculatePowerData(displayValue);

  const renderPeakCell = (peakStr: string, isSelected: boolean) => {
    const val = parseFloat(peakStr.replace(/,/g, ''));
    const colorClass = isSelected ? 'text-white' : 'text-blue-400';
    
    if (val >= 100 && peakStr.includes('.')) {
      const [intPart, decPart] = peakStr.split('.');
      return (
        <div className={`flex items-baseline font-extrabold tabular ${colorClass}`}>
          <span className="text-[18px]">{intPart}</span>
          <span className="text-[13px] opacity-80">.{decPart}</span>
        </div>
      );
    }
    
    return (
      <div className={`font-extrabold text-[18px] tabular ${colorClass}`}>
        {peakStr}
      </div>
    );
  };

  const renderFlashButton = (isTop: boolean) => (
    <button 
      onClick={() => toggleFlash()} 
      className={`relative rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 border border-white/5 ${isTop ? 'flex-1' : ''} ${isFlashOn ? 'bg-amber-500 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.4)]' : 'bg-slate-700 text-slate-400'}`}
    >
      {/* 플래시 포인트 인디케이터: 모든 버튼에 적용 */}
      {isFlashOn && (
        <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.9)] animate-pulse z-10"></div>
      )}
      <i className={`fa-solid ${isFlashOn ? 'fa-lightbulb' : 'fa-bolt'} text-lg`}></i>
      <span className="text-[8px] font-bold mt-1 uppercase">{hasFlash ? 'FLASH' : 'LIGHT'}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 max-w-md mx-auto shadow-2xl overflow-hidden select-none relative">
      
      {!hasFlash && isFlashOn && (
        <div className="fixed inset-0 z-[100] bg-white animate-in fade-in duration-300 flex flex-col items-center justify-center cursor-pointer" onClick={() => toggleFlash(false)}>
          <i className="fa-solid fa-lightbulb text-slate-200 text-6xl animate-pulse"></i>
          <div className="mt-10 px-8 py-4 border-2 border-slate-200 text-slate-500 rounded-full text-sm font-black tracking-widest uppercase">TAP TO CLOSE</div>
        </div>
      )}

      <header className={`h-[44px] flex items-center justify-between pl-4 pr-0 bg-slate-950 text-white z-20 border-b transition-all duration-300 ${isFlashOn ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-white/5'}`}>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-bolt-lightning text-[12px] text-blue-500"></i>
          <h1 className="text-[11px] font-extrabold tracking-widest uppercase opacity-90">Peak Pro</h1>
        </div>
        <div className="flex items-center h-full">
          <span className="text-[11px] font-semibold opacity-60 mr-4 tabular">{new Date().getMonth()+1}월 {new Date().getDate()}일</span>
          <button 
            onClick={() => window.confirm("종료하시겠습니까?") && window.close()} 
            className="h-full px-6 flex items-center justify-center text-slate-400 active:text-white active:bg-white/10 active:scale-95 transition-all" 
            title="나가기"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-lg"></i>
          </button>
        </div>
      </header>

      <div className="p-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 shadow-xl relative z-10">
        <div className="h-[72px] flex items-stretch gap-3">
          {renderFlashButton(true)}
          
          <div className="flex-[4] bg-slate-950 rounded-2xl p-1 flex flex-col items-center justify-center shadow-inner relative overflow-hidden border border-white/5">
            <span key={lastInputTime} className={`text-5xl font-bold tracking-tight transition-all duration-300 tabular digit-animate ${isActive ? 'text-white' : 'text-slate-600'}`}>
              {displayValue}
            </span>
            <div className={`absolute top-2 right-4 w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isActive ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'}`}></div>
          </div>

          {renderFlashButton(true)}
        </div>
      </div>

      <div className="h-[34px] grid grid-cols-[1fr_1fr_1.3fr_1.7fr] px-2 bg-slate-950 border-b border-white/5 items-center shadow-lg relative z-10">
        <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max TR</div>
        <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">CT</div>
        <div className="text-center text-[11px] font-bold text-amber-400/90 uppercase tracking-wider">MOF</div>
        <div className="text-center text-[11px] font-bold text-blue-400/90 tracking-wider">
          <span className="uppercase">Peak</span> 
          <span className="text-slate-500 ml-0.5 font-medium text-[9px]">[kW]</span>
        </div>
      </div>

      <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto bg-slate-900 px-2 py-3 custom-scrollbar ${isScrolling ? 'is-scrolling' : ''}`}>
        <div className="flex flex-col gap-2">
          {powerData.map((row, idx) => (
            <div 
              key={idx} 
              onMouseDown={() => onItemPressStart(row, idx)}
              onMouseUp={() => onItemPressEnd(idx)}
              onTouchStart={() => onItemPressStart(row, idx)}
              onTouchEnd={() => onItemPressEnd(idx)}
              className={`h-[48px] grid grid-cols-[1fr_1fr_1.3fr_1.7fr] items-center rounded-2xl transition-all duration-200 cursor-pointer border ${selectedRowIndex === idx ? 'bg-blue-600 border-blue-400 shadow-[0_4px_15px_rgba(37,99,235,0.3)] scale-[1.01] z-10' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'}`}
            >
              <div className="text-center font-semibold text-[13px] tabular">{row.maxTR}</div>
              <div className="text-center font-semibold text-[13px] tabular opacity-80">{row.ct}</div>
              <div className={`text-center font-bold text-[15px] tabular ${selectedRowIndex === idx ? 'text-amber-200' : 'text-white'}`}>{row.mof}</div>
              <div className="flex items-center justify-center">
                {renderPeakCell(row.peakPower, selectedRowIndex === idx)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-950 p-3 pb-safe grid grid-cols-3 gap-2 border-t border-white/5 shadow-2xl">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <KeypadButton key={num} label={num} isNumber onClick={() => handleKeyPress(num)} />
        ))}
        
        <KeypadButton 
          label={
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              {isFlashOn && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.9)] animate-pulse z-10"></div>
              )}
              <i className={`fa-solid ${isFlashOn ? 'fa-lightbulb' : 'fa-bolt'} text-xl transition-transform ${isFlashOn ? 'scale-110' : ''}`}></i>
              <span className="text-[8px] font-bold mt-0.5 leading-none uppercase">{hasFlash ? 'FLASH' : 'LIGHT'}</span>
            </div>
          }
          onClick={() => handleKeyPress('FLASH')}
          className={`
            ${isFlashOn 
              ? 'text-slate-950 !bg-amber-500 !border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.5)]' 
              : 'text-amber-500/80 !bg-slate-800/40 !border-white/5'
            }
          `}
        />

        <KeypadButton label="0" isNumber onClick={() => handleKeyPress('0')} />

        <KeypadButton
          label={<i className="fa-solid fa-delete-left text-xl"></i>}
          onClick={() => {}}
          onMouseDown={onBackStart}
          onMouseUp={onBackEnd}
          onTouchStart={onBackStart}
          onTouchEnd={onBackEnd}
          className="text-blue-400 !bg-slate-800/40 !border-white/5"
        />
      </div>

      {aissPopup && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-6" onClick={() => setAissPopup(null)}>
          <div className="bg-slate-900 rounded-[2.5rem] w-full max-w-[320px] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-950/50 px-8 py-5 flex justify-between items-center border-b border-white/5">
              <span className="font-bold text-[11px] tracking-widest uppercase text-slate-400">AISS Standard Settings</span>
              <button onClick={() => setAissPopup(null)} className="text-slate-500 active:text-white transition-colors p-2">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-black/20 p-5 rounded-[2rem] border border-white/5 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">예상변압기용량</span>
                <div className="text-3xl font-bold text-white tabular">{aissPopup.maxTR.toLocaleString()}<span className="text-sm ml-1 text-blue-500 font-medium">kW</span></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-[1.8rem] border border-white/5 text-center">
                  <span className="text-[9px] font-bold text-blue-400 uppercase mb-2 block">상전류</span>
                  <div className="text-2xl font-bold text-white tabular">{aissPopup.phaseCurrent}<span className="text-xs ml-0.5 text-blue-500/50 font-medium">A</span></div>
                </div>
                <div className="bg-slate-800/50 p-5 rounded-[1.8rem] border border-white/5 text-center">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase mb-2 block">지락전류</span>
                  <div className="text-2xl font-bold text-white tabular">{aissPopup.groundCurrent}<span className="text-xs ml-0.5 text-emerald-500/50 font-medium">A</span></div>
                </div>
              </div>

              <div className="bg-amber-500/5 p-5 rounded-[1.8rem] border border-amber-500/20 text-center">
                <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 block">Time Delay</span>
                <div className="text-2xl font-bold text-amber-500 tabular">{aissPopup.timeDelay}<span className="text-xs ml-1 opacity-70 font-medium">sec</span></div>
              </div>

              <button 
                onClick={() => setAissPopup(null)} 
                className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-bold shadow-xl shadow-blue-900/30 uppercase tracking-widest active:scale-95 transition-all border border-blue-400"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface KeypadButtonProps {
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
  isNumber?: boolean;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
}

const KeypadButton: React.FC<KeypadButtonProps> = ({ 
  label, onClick, className = '', isNumber = false,
  onMouseDown, onMouseUp, onTouchStart, onTouchEnd
}) => (
  <button
    onClick={onClick}
    onMouseDown={onMouseDown}
    onMouseUp={onMouseUp}
    onTouchStart={onTouchStart}
    onTouchEnd={onTouchEnd}
    className={`
      h-[44px] bg-slate-800/60 active:bg-slate-700/80 text-white 
      rounded-2xl transition-all active:scale-[0.95] flex items-center justify-center 
      border border-white/5 shadow-lg tabular relative
      ${isNumber ? 'text-2xl font-semibold' : ''} 
      ${className}
    `}
  >
    {label}
  </button>
);

export default App;
