
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PowerCalculation, AISSSetting } from './types';
import { CT_VALUES, PT_RATIO, MAX_TR_MULTIPLIER, AISS_CONFIG_TABLE } from './constants';

const APP_VERSION = "v 1.4";

const App: React.FC = () => {
  const [inputDigits, setInputDigits] = useState<string[]>(() => {
    const saved = localStorage.getItem('last_input_digits');
    return saved ? JSON.parse(saved) : ['0', '0', '0', '0'];
  });
  const [isActive, setIsActive] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  // 안드로이드인 경우 기본적으로 플래시가 있다고 가정하여 버튼을 보여줌
  const [isAndroid] = useState(/Android/i.test(navigator.userAgent));
  const [hasFlash, setHasFlash] = useState(false); 
  const [isScrolling, setIsScrolling] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(() => {
    const saved = localStorage.getItem('selected_index');
    return saved !== null ? parseInt(saved, 10) : 2;
  });
  const [aissPopup, setAissPopup] = useState<AISSSetting | null>(null);
  const [lastInputTime, setLastInputTime] = useState(0);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const timerRef = useRef<number | null>(null);
  const scrollTimerRef = useRef<number | null>(null);
  const backLongPressTimerRef = useRef<number | null>(null);
  const itemLongPressTimerRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    // 안드로이드 갤럭시의 경우 시작 시 권한 팝업 없이 기능을 체크할 수 있는 방법이 제한적이므로
    // 버튼을 일단 보여주고, 첫 클릭 시 권한을 얻어 하드웨어를 제어합니다.
    return () => {
      stopCamera();
    };
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

  const stopCamera = () => {
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
  };

  const initCamera = async () => {
    if (isCameraInitializing) return null;
    setIsCameraInitializing(true);
    try {
      // 플래시(Torch)를 제어하려면 브라우저 보안 정책상 '카메라 권한'이 반드시 필요합니다.
      // 실제 영상을 찍지는 않지만 하드웨어 접근을 위해 필요함을 사용자에게 알리는 과정이 수반됩니다.
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          // 갤럭시 등 안드로이드 최적화 제약 조건
          focusMode: 'continuous' as any,
          whiteBalanceMode: 'continuous' as any
        } 
      });
      
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
      
      if (capabilities && capabilities.torch) {
        setHasFlash(true);
        videoTrackRef.current = track;
        setIsCameraInitializing(false);
        return track;
      } else {
        // 플래시 기능이 없는 기기라면 플래시 상태 해제
        setHasFlash(false);
        track.stop();
        setIsCameraInitializing(false);
        return null;
      }
    } catch (err) {
      console.error("Flash(Camera) init failed:", err);
      // 권한 거부 시 다시 묻지 않도록 상태 관리 필요 시 로직 추가 가능
      setHasFlash(false);
      setIsCameraInitializing(false);
      return null;
    }
  };

  const toggleFlash = async (state?: boolean) => {
    const newState = state !== undefined ? state : !isFlashOn;
    
    let track = videoTrackRef.current;
    if (newState && !track) {
      track = await initCamera();
    }

    if (track) {
      try {
        await track.applyConstraints({ 
          advanced: [{ torch: newState }] 
        } as any);
        setIsFlashOn(newState);
      } catch (err) {
        console.error("Torch control failed:", err);
        // 트랙이 유효하지 않으면 다시 시도
        const retryTrack = await initCamera();
        if (retryTrack) {
          try {
            await retryTrack.applyConstraints({ advanced: [{ torch: newState }] } as any);
            setIsFlashOn(newState);
          } catch (e) {
            setIsFlashOn(newState); 
          }
        } else {
          setIsFlashOn(newState);
        }
      }
    } else {
      // 하드웨어 지원이 없거나 권한이 없는 경우 (iOS는 화면 조명, 안드로이드는 무반응 혹은 화면 조명 선택 가능)
      setIsFlashOn(newState);
    }
    
    if ('vibrate' in navigator) navigator.vibrate(newState ? [30, 10, 30] : 20);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isFlashOn) toggleFlash(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
          <span className="text-[25px]">{intPart}</span>
          <span className="text-[17px] opacity-80">.{decPart}</span>
        </div>
      );
    }
    
    return (
      <div className={`font-extrabold text-[25px] tabular ${colorClass}`}>
        {peakStr}
      </div>
    );
  };

  const renderFlashButton = (isTop: boolean) => {
    // 안드로이드라면 일단 플래시가 있다고 가정하고 보여줌 (갤럭시 대부분 존재)
    // iOS의 경우 하드웨어 플래시가 확인되었거나, 아직 확인 전이라면 보여줌
    const shouldShow = isAndroid || hasFlash || (!isCameraInitializing && !videoTrackRef.current);
    if (isTop && !shouldShow) return null;

    return (
      <button 
        onClick={() => toggleFlash()} 
        className={`relative rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 border border-white/5 ${isTop ? 'flex-1' : ''} ${isFlashOn ? 'bg-amber-500 text-slate-950 shadow-[0_4px_20px_rgba(245,158,11,0.4)]' : 'bg-slate-700 text-slate-400'}`}
      >
        {isFlashOn && (
          <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse z-10"></div>
        )}
        <i className={`fa-solid ${isFlashOn ? 'fa-lightbulb' : 'fa-bolt'} text-xl transition-transform`}></i>
        <span className="text-[9px] font-bold mt-0.5 uppercase">LIGHT</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 max-w-md mx-auto shadow-2xl overflow-hidden select-none relative">
      
      {/* iOS 등 하드웨어 지원이 안되는 환경에서만 화이트 스크린 조명 사용 (사용자 요청 반영) */}
      {isIOS && !hasFlash && isFlashOn && (
        <div className="fixed inset-0 z-[100] bg-white animate-in fade-in duration-300 flex flex-col items-center justify-center cursor-pointer" onClick={() => toggleFlash(false)}>
          <i className="fa-solid fa-lightbulb text-slate-200 text-6xl animate-pulse"></i>
          <div className="mt-10 px-8 py-4 border-2 border-slate-200 text-slate-500 rounded-full text-sm font-black tracking-widest uppercase">TAP TO CLOSE</div>
        </div>
      )}

      <header className={`h-[44px] flex items-center justify-between pl-4 pr-0 bg-slate-950 text-white z-20 border-b transition-all duration-300 ${isFlashOn ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-white/5'}`}>
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-bolt-lightning text-[12px] text-blue-500"></i>
          <div className="flex items-baseline">
            <h1 className="text-[12px] font-extrabold tracking-widest uppercase opacity-90">Peak Pro</h1>
            <span className="text-[8px] font-bold ml-1.5 opacity-40 tabular">{APP_VERSION}</span>
          </div>
        </div>
        <div className="flex items-center h-full">
          <span className="text-[11px] font-semibold opacity-60 mr-4 tabular">{new Date().getMonth()+1}월 {new Date().getDate()}일</span>
          <button 
            onClick={() => window.confirm("종료하시겠습니까?") && window.close()} 
            className="h-full px-6 flex items-center justify-center text-slate-400 active:text-white active:bg-white/10 active:scale-95 transition-all" 
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-lg"></i>
          </button>
        </div>
      </header>

      {/* 입력창 영역: 높이 3% 축소 (84px -> 81px) */}
      <div className="p-3 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 shadow-xl relative z-10">
        <div className="h-[81px] flex items-stretch gap-3">
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

      <div className="h-[40px] grid grid-cols-[1fr_1fr_1.3fr_1.7fr] px-2 bg-slate-950 border-b border-white/5 items-center shadow-lg relative z-10">
        <div className="text-center text-[12px] font-bold text-slate-500 uppercase tracking-wider">Max TR</div>
        <div className="text-center text-[12px] font-bold text-slate-500 uppercase tracking-wider">CT</div>
        <div className="text-center text-[12px] font-bold text-amber-400/90 uppercase tracking-wider">MOF</div>
        <div className="text-center text-[12px] font-bold text-blue-400/90 tracking-wider">
          <span className="uppercase">Peak</span> 
          <span className="text-slate-500 ml-1 font-medium text-[9px]">[kW]</span>
        </div>
      </div>

      {/* 리스트 본문: 행 높이 3% 축소 (64px -> 62px) */}
      <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto bg-slate-900 px-2 py-3 custom-scrollbar ${isScrolling ? 'is-scrolling' : ''}`}>
        <div className="flex flex-col gap-2.5">
          {powerData.map((row, idx) => (
            <div 
              key={idx} 
              onMouseDown={() => onItemPressStart(row, idx)}
              onMouseUp={() => onItemPressEnd(idx)}
              onTouchStart={() => onItemPressStart(row, idx)}
              onTouchEnd={() => onItemPressEnd(idx)}
              className={`h-[62px] grid grid-cols-[1fr_1fr_1.3fr_1.7fr] items-center rounded-2xl transition-all duration-200 cursor-pointer border ${selectedRowIndex === idx ? 'bg-blue-600 border-blue-400 shadow-[0_8px_25px_rgba(37,99,235,0.4)] scale-[1.01] z-10' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60'}`}
            >
              <div className="text-center font-bold text-[17px] tabular">{row.maxTR}</div>
              <div className="text-center font-semibold text-[17px] tabular opacity-80">{row.ct}</div>
              <div className={`text-center font-bold text-[19px] tabular ${selectedRowIndex === idx ? 'text-amber-200' : 'text-white'}`}>{row.mof}</div>
              <div className="flex items-center justify-center">
                {renderPeakCell(row.peakPower, selectedRowIndex === idx)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 키패드: 버튼 높이 5% 축소 (58px -> 55px) */}
      <div className="bg-slate-950 p-3 pb-safe grid grid-cols-3 gap-2.5 border-t border-white/5 shadow-2xl">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <KeypadButton key={num} label={num} isNumber onClick={() => handleKeyPress(num)} />
        ))}
        
        <KeypadButton 
          label={
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              {isFlashOn && (
                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-pulse z-10"></div>
              )}
              <i className={`fa-solid ${isFlashOn ? 'fa-lightbulb' : 'fa-bolt'} text-xl transition-transform ${isFlashOn ? 'scale-110' : ''}`}></i>
              <span className="text-[10px] font-bold mt-1 leading-none uppercase">LIGHT</span>
            </div>
          }
          onClick={() => handleKeyPress('FLASH')}
          className={`${isFlashOn ? 'text-slate-950 !bg-amber-500 !border-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.5)]' : 'text-amber-500/80 !bg-slate-800/40 !border-white/5'}`}
        />

        <KeypadButton label="0" isNumber onClick={() => handleKeyPress('0')} />

        <KeypadButton
          label={<i className="fa-solid fa-delete-left text-2xl"></i>}
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
      h-[55px] bg-slate-800/60 active:bg-slate-700/80 text-white 
      rounded-2xl transition-all active:scale-[0.95] flex items-center justify-center 
      border border-white/5 shadow-lg tabular relative
      ${isNumber ? 'text-3xl font-semibold' : ''} 
      ${className}
    `}
  >
    {label}
  </button>
);

export default App;
