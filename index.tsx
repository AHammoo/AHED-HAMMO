import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

type GameState = 'MAIN_MENU' | 'SETUP' | 'PLAYER_SETUP' | 'SPY_COUNT_SETUP' | 'ROLE_REVEAL' | 'QUESTION_TURN' | 'RAPID_ROUND_TRANSITION' | 'RAPID_ROUND' | 'VOTING' | 'RESULTS_REVEAL' | 'RESULTS';
type Player = { name: string; score: number; crowns: number; avatar: number; };
type Votes = { [voter: string]: string[] };
type Result = { player: string; vote: string; correct: boolean; pointsGained: number; abilityRefund?: boolean };
type SpyGuessResult = { choice: string; correct: boolean; points: number };
type GameMode = 'SPY' | 'WOLF';
type SoundType = 'addPlayer' | 'removePlayer' | 'startGame' | 'reveal' | 'next' | 'vote' | 'submit' | 'shuffleTick' | 'accused' | 'spyCaught' | 'spyEscaped' | 'guessCorrect' | 'guessIncorrect' | 'ability' | 'modeSelect' | 'categorySelect';
type CustomCategory = { name: string; words: string[] };
type GuessAnimationState = { guess: string | null, status: 'correct' | 'incorrect' | null };


const avatarColors = [
    '#EF476F', '#FFD166', '#06D6A0', '#118AB2',
    '#F78C6B', '#7209b7', '#fca311', '#073B4C'
];

const avatars: React.ReactElement[] = avatarColors.map(color => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill={color} stroke="#2e2e2e" strokeWidth="4"/>
    </svg>
));

const animal_category = [
    // Mammals (Savannah/Jungle)
    "أسد", "نمر", "فهد", "فيل", "زرافة", "دب", "ذئب", "ثعلب",
    "قرد", "شمبانزي", "غوريلا", "حمار وحشي", "وحيد القرن", "فرس النهر",
    "ضبع", "غزال", "كنغر", "كوالا", "باندا", "كسلان",

    // Mammals (Domestic/Farm)
    "حصان", "جمل", "بقرة", "خروف", "ماعز", "قط", "كلب", "أرنب",
    "هامستر", "فأر", "لاما",

    // Mammals (Other)
    "سنجاب", "قنفذ", "خفاش", "خلد",

    // Birds
    "بطة", "نعامة", "بطريق", "ببغاء", "غراب", "يمامة", "حمامة", "دجاجة",
    "ديك", "ديك رومي", "صقر", "بومة", "طاووس", "بجعة",
    "نقار الخشب", "فلامنغو", "طائر الطنان",

    // Sea Creatures
    "سمكة قرش", "دلفين", "حوت", "أخطبوط", "حبار", "سرطان البحر",
    "جمبري", "سمك السلمون", "قنديل البحر", "سمكة الذهب", "حصان البحر",
    "نجمة البحر",

    // Reptiles & Amphibians
    "تمساح", "سلحفاة", "تنين كومودو", "ثعبان", "أفعى", "سحلية",
    "حرباء", "ضفدع", "سلمندر",

    // Insects & Arachnids
    "نحلة", "فراشة", "جرادة", "عنكبوت", "خنفساء", "عقرب", "يعسوب",
    "دعسوقة", "صرصور", "نملة", "بعوضة"
];

const foods_category = [
    "بيتزا", "شاورما", "كبسة", "سوشي", "برجر", "معكرونة", "فلافل", "حمص", "منسف", "ورق عنب"
];

const shows_category = [
    "باب الحارة", "الهيبة", "كسر عضم", "عروس بيروت", "الاختيار", "ضيعة ضايعة", "مرايا", "طاش ما طاش", "شباب البومب", "جعفر العمدة"
];

const superheroes_category = [
    "سوبرمان", "باتمان", "سبايدرمان", "آيرون مان", "كابتن أمريكا", "هالك", "ثور", "وندر وومان", "فلاش", "أكوامان"
];

const games_category = [
    "سوبر ماريو", "فورتنايت", "ماينكرافت", "فيفا", "كول أوف ديوتي", "ذا ليجند أوف زيلدا", "كراش بانديكوت", "ببجي", "أوفر واتش", "جراند ثفت أوتو"
];

const places_al_rajma = [
    "المدرسة الثانوية",
    "المدرسة الإعدادية",
    "المدرسة الإبتدائية",
    "دكان عياد",
    "دكان عزالدين",
    "دكان عيت بوشريف",
    "دكان عبوة",
    "دكان عيت شقلوف",
    "دكان زياد",
    "مسجد شداد بن أوس",
    "مسجد حذيفة بن عتبة",
    "حوش فياض",
    "شارع الكيس",
    "المستشفى",
    "مستودع الحامي",
    "الملعب الفوقاني",
    "وادي الصالحين"
];

type Category = {
    name: string;
};

const categories: Category[] = [
    { name: "عشوائي" },
    { name: "أكلات" },
    { name: "مسلسلات عربية" },
    { name: "أبطال خارقين" },
    { name: "ألعاب فيديو" },
    { name: "حيوانات" },
    { name: "أماكن الرجمة" },
];

const ParticleEffect: React.FC<{ count: number }> = React.memo(({ count }) => {
    return (
        <div className="particle-container">
            {Array.from({ length: count }).map((_, i) => (
                <div className="particle" key={i}></div>
            ))}
        </div>
    );
});

type ResultsRevealScreenProps = {
    players: Player[];
    accusedPlayer: string;
    spies: string[];
    onRevealComplete: () => void;
    gameMode: GameMode;
    playSound: (soundType: SoundType) => void;
};

const ResultsRevealScreen: React.FC<ResultsRevealScreenProps> = ({ players, accusedPlayer, spies, onRevealComplete, gameMode, playSound }) => {
    const [highlightedPlayer, setHighlightedPlayer] = useState<string | null>(null);
    const [revealStep, setRevealStep] = useState<'shuffling' | 'accused' | 'spy'>('shuffling');
    const [statusText, setStatusText] = useState('...يتم فرز الأصوات');
    const roleName = useMemo(() => gameMode === 'SPY' ? (spies.length > 1 ? 'الجواسيس' : 'الجاسوس') : 'الذئب', [gameMode, spies]);
    const [isDramatic, setIsDramatic] = useState(false);
    const [animationState, setAnimationState] = useState<'none' | 'caught' | 'escaped'>('none');

    useEffect(() => {
        const playerNames = players.map(p => p.name);
        let shuffleCount = 0;
        const totalShuffles = 40; // Increased for longer duration
        const initialInterval = 50; // Starts fast
        const finalInterval = 500; // Ends slow

        let timeoutId: number;

        const shuffle = () => {
            setHighlightedPlayer(prevHighlighted => {
                let newHighlightedPlayer = prevHighlighted;
                if (playerNames.length > 1) {
                    while (newHighlightedPlayer === prevHighlighted) {
                        newHighlightedPlayer = playerNames[Math.floor(Math.random() * playerNames.length)];
                    }
                } else if (playerNames.length === 1) {
                     newHighlightedPlayer = playerNames[0];
                }
                return newHighlightedPlayer;
            });
            
            playSound('shuffleTick');
            shuffleCount++;

            if (shuffleCount > totalShuffles) {
                setHighlightedPlayer(accusedPlayer);
                setRevealStep('accused');
                setStatusText(`!اللاعبون صوتوا ضد... ${accusedPlayer}`);
                playSound('accused');

                setTimeout(() => {
                    setRevealStep('spy');
                    setIsDramatic(true);
                    if (spies.includes(accusedPlayer)) {
                        setStatusText(`لقد كان ${accusedPlayer} أحد الجواسيس بالفعل!`);
                        playSound('spyCaught');
                        setAnimationState('caught');
                    } else {
                        setStatusText(`...لكن ${roleName} الحقيقي كان`);
                        playSound('spyEscaped');
                        setAnimationState('escaped');
                    }

                    setTimeout(() => {
                        onRevealComplete();
                    }, 3000);
                }, 2500);

            } else {
                const progress = shuffleCount / totalShuffles;
                const easedProgress = progress * progress;
                const currentInterval = initialInterval + (finalInterval - initialInterval) * easedProgress;
                
                timeoutId = window.setTimeout(shuffle, currentInterval);
            }
        };

        timeoutId = window.setTimeout(shuffle, initialInterval);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [players, accusedPlayer, spies, onRevealComplete, roleName, playSound]);

    const getPlayerClass = (playerName: string) => {
        if (revealStep === 'spy') {
            return spies.includes(playerName) ? 'player-card spy-revealed' : 'player-card faded';
        }
        if (revealStep === 'accused' && playerName === accusedPlayer) {
            return 'player-card accused';
        }
        if (revealStep === 'shuffling' && playerName === highlightedPlayer) {
            return 'player-card highlighted';
        }
        return 'player-card';
    };
    
    const otherSpies = spies.filter(s => s !== accusedPlayer);

    return (
        <div className={`card ${isDramatic ? 'dramatic-reveal' : ''} ${animationState === 'caught' ? 'spy-caught-animation' : ''} ${animationState === 'escaped' ? 'spy-escaped-animation' : ''}`}>
            {animationState === 'caught' && (
                <>
                    <div className="result-overlay-text caught">تم كشفه</div>
                    <ParticleEffect count={150} />
                </>
            )}
            {animationState === 'escaped' && (
                <div className="result-overlay-text escaped">لقد هرب</div>
            )}
            <div className="reveal-animation-container">
                <h3>كشف النتائج</h3>
                <p className="reveal-status-text">{statusText}</p>
                <div className="player-names-grid">
                    {players.map(player => (
                        <div key={player.name} className={getPlayerClass(player.name)}>
                             <div className="player-avatar-container large">{avatars[player.avatar]}</div>
                             <span className="player-name-text">{player.name}</span>
                        </div>
                    ))}
                </div>
                {revealStep === 'spy' && !spies.includes(accusedPlayer) && (
                     <p className="final-spy-reveal">{spies.join(' و ')}!</p>
                )}
                 {revealStep === 'spy' && spies.includes(accusedPlayer) && otherSpies.length > 0 && (
                     <p className="final-spy-reveal">الجاسوس الآخر كان {otherSpies.join(' و ')}!</p>
                )}
            </div>
        </div>
    );
};

const TimerParticles: React.FC = React.memo(() => {
    return (
        <div className="timer-particle-container">
            {Array.from({ length: 15 }).map((_, i) => (
                <div className="timer-particle" key={i} />
            ))}
        </div>
    );
});


const TimerCircle: React.FC<{ duration: number; timeRemaining: number }> = ({ duration, timeRemaining }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (timeRemaining / duration) * circumference;

    const isCritical = timeRemaining <= 5;
    let timerColorClass = 'green';
    if (timeRemaining <= 5) {
        timerColorClass = 'red';
    } else if (timeRemaining <= 10) {
        timerColorClass = 'yellow';
    }

    return (
        <div className={`timer-container ${isCritical ? 'critical' : ''}`}>
            {isCritical && <TimerParticles />}
            <svg className="timer-svg" viewBox="0 0 120 120">
                <circle className="timer-bg" cx="60" cy="60" r={radius} />
                <circle
                    className={`timer-progress ${timerColorClass}`}
                    cx="60" cy="60"
                    r={radius}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className="timer-text">{timeRemaining}</span>
        </div>
    );
};

const App = () => {
    const RAPID_ROUND_DURATION = 20;
    const [gameState, setGameState] = useState<GameState>('MAIN_MENU');
    const [gameMode, setGameMode] = useState<GameMode>('SPY');
    const [players, setPlayers] = useState<Player[]>([]);
    const [playerInput, setPlayerInput] = useState<string>('');
    const [topic, setTopic] = useState<string>('');
    const [wolfWord, setWolfWord] = useState<string>('');
    const [spies, setSpies] = useState<string[]>([]);
    const [votes, setVotes] = useState<Votes>({});
    const [results, setResults] = useState<Result[]>([]);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [isRoleVisible, setIsRoleVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('عشوائي');
    const [spyGuessOptions, setSpyGuessOptions] = useState<string[]>([]);
    const [spyGuessResults, setSpyGuessResults] = useState<{ [spyName: string]: SpyGuessResult }>({});
    const [accusedPlayer, setAccusedPlayer] = useState<string | null>(null);
    const [abilityUsedThisRound, setAbilityUsedThisRound] = useState<string[]>([]);
    const [isBackConfirmVisible, setIsBackConfirmVisible] = useState<boolean>(false);
    const [questionTurns, setQuestionTurns] = useState<{ asker: string, target: string }[]>([]);

    const [abilityAsker, setAbilityAsker] = useState<string>('');
    const [abilityTarget, setAbilityTarget] = useState<string>('');
    const [abilityUsedMessage, setAbilityUsedMessage] = useState<string>('');
    
    const [isAddingPlayer, setIsAddingPlayer] = useState<boolean>(false);
    const [selectedAvatar, setSelectedAvatar] = useState<number>(0);
    
    const [isMuted, setIsMuted] = useState<boolean>(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const [votedPlayers, setVotedPlayers] = useState<string[]>([]);

    const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
    const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState<boolean>(false);
    const [newCategoryName, setNewCategoryName] = useState<string>('');
    const [newCategoryWords, setNewCategoryWords] = useState<string>('');
    const [categoryCreationState, setCategoryCreationState] = useState<'idle' | 'success'>('idle');
    const [spyCountMode, setSpyCountMode] = useState<'SINGLE' | 'RANDOM'>('SINGLE');
    const [showVoteDetails, setShowVoteDetails] = useState<boolean>(false);
    const [guessAnimationState, setGuessAnimationState] = useState<GuessAnimationState>({ guess: null, status: null });
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const [rapidRoundIndex, setRapidRoundIndex] = useState(0);
    const [rapidRoundOrder, setRapidRoundOrder] = useState<string[]>([]);
    const [timerValue, setTimerValue] = useState(RAPID_ROUND_DURATION);
    const [rapidRoundTarget, setRapidRoundTarget] = useState<Player | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // FIX: Moved playSound and initAudio functions here, before they are used in useEffect hooks, to prevent a "used before declaration" error.
    const playSound = useCallback((soundType: SoundType) => {
        if (isMuted || !audioCtxRef.current) return;
        const audioCtx = audioCtxRef.current;
        const time = audioCtx.currentTime;
    
        const playNote = (freq: number, startTime: number, duration: number, volume: number = 0.3, type: OscillatorType = 'sine') => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
    
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
    
        switch (soundType) {
            case 'addPlayer': playNote(600, time, 0.2, 0.4, 'triangle'); playNote(900, time + 0.1, 0.2, 0.4, 'triangle'); break;
            case 'removePlayer': playNote(500, time, 0.25, 0.3, 'sawtooth'); playNote(300, time + 0.05, 0.25, 0.3, 'sawtooth'); break;
            case 'startGame': playNote(261.63, time, 0.2); playNote(329.63, time + 0.2, 0.2); playNote(392.00, time + 0.4, 0.3); break;
            case 'reveal': {
                const duration = 0.5;
                const bufferSize = audioCtx.sampleRate * duration;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noiseSource = audioCtx.createBufferSource();
                noiseSource.buffer = buffer;

                const filter = audioCtx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.Q.value = 10;
                
                const gainNode = audioCtx.createGain();

                noiseSource.connect(filter);
                filter.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                gainNode.gain.setValueAtTime(0, time);
                gainNode.gain.linearRampToValueAtTime(0.4, time + 0.05);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

                filter.frequency.setValueAtTime(8000, time);
                filter.frequency.exponentialRampToValueAtTime(200, time + duration);

                noiseSource.start(time);
                noiseSource.stop(time + duration);
                break;
            }
            case 'next': playNote(880, time, 0.1, 0.2, 'square'); break;
            case 'vote': playNote(1200, time, 0.1, 0.25, 'triangle'); break;
            case 'submit': playNote(200, time, 0.15, 0.5, 'square'); break;
            case 'shuffleTick': playNote(1500, time, 0.05, 0.1, 'triangle'); break;
            case 'accused': playNote(110, time, 0.6, 0.6, 'sawtooth'); break;
            case 'modeSelect': playNote(440, time, 0.1, 0.3, 'triangle'); playNote(550, time, 0.1, 0.3, 'triangle'); break;
            case 'categorySelect': playNote(880, time, 0.15, 0.2, 'sine'); break;
            case 'spyCaught': {
                const hitTime = time + 0.1;
                const drone = audioCtx.createOscillator(); const droneGain = audioCtx.createGain(); drone.connect(droneGain); droneGain.connect(audioCtx.destination);
                drone.type = 'sawtooth';
                drone.frequency.setValueAtTime(80, time);
                droneGain.gain.setValueAtTime(0, time); droneGain.gain.linearRampToValueAtTime(0.4, time + 0.05); droneGain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);
                drone.start(time); drone.stop(time + 1.5);
                playNote(440, hitTime, 0.8, 0.5, 'sawtooth');
                playNote(440 * 1.5, hitTime, 0.8, 0.5, 'sawtooth');
                break;
            }
            case 'spyEscaped': {
                const fall = audioCtx.createOscillator(); const fallGain = audioCtx.createGain(); fall.connect(fallGain); fallGain.connect(audioCtx.destination);
                fall.type = 'sawtooth';
                fall.frequency.setValueAtTime(300, time); fall.frequency.exponentialRampToValueAtTime(100, time + 1.2);
                fallGain.gain.setValueAtTime(0, time); fallGain.gain.linearRampToValueAtTime(0.5, time + 0.02); fallGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
                fall.start(time); fall.stop(time + 1.2);
                const overtone = audioCtx.createOscillator(); const overtoneGain = audioCtx.createGain(); overtone.connect(overtoneGain); overtoneGain.connect(audioCtx.destination);
                overtone.type = 'square';
                overtone.frequency.setValueAtTime(315, time); overtone.frequency.exponentialRampToValueAtTime(105, time + 1.2);
                overtoneGain.gain.setValueAtTime(0, time); overtoneGain.gain.linearRampToValueAtTime(0.2, time + 0.02); overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);
                overtone.start(time); overtone.stop(time + 1.2);
                break;
            }
            case 'guessCorrect': {
                for (let i = 0; i < 15; i++) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'square';
                    osc.frequency.value = 1200 + Math.random() * 800;
                    const startTime = time + Math.random() * 0.4;
                    gain.gain.setValueAtTime(0.2, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
                    osc.start(startTime);
                    osc.stop(startTime + 0.1);
                }
                const cheerDuration = 2;
                const cheer = audioCtx.createBufferSource();
                const bufferSize = audioCtx.sampleRate * cheerDuration;
                const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
                cheer.buffer = buffer;
                const cheerGain = audioCtx.createGain();
                const filter = audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 800 + Math.random() * 400;
                filter.Q.value = 1;
                cheer.connect(filter);
                filter.connect(cheerGain);
                cheerGain.connect(audioCtx.destination);
                cheerGain.gain.setValueAtTime(0, time);
                cheerGain.gain.linearRampToValueAtTime(0.2, time + 0.5);
                cheerGain.gain.exponentialRampToValueAtTime(0.0001, time + cheerDuration);
                cheer.start(time);
                cheer.stop(time + cheerDuration);
                break;
            }
            case 'guessIncorrect': {
                const booDuration = 2.0;
                for (let i = 0; i < 5; i++) {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'sawtooth';
                    const startFreq = 150 + Math.random() * 50;
                    osc.frequency.setValueAtTime(startFreq, time);
                    osc.frequency.exponentialRampToValueAtTime(startFreq - 40, time + booDuration);
                    gain.gain.setValueAtTime(0, time);
                    gain.gain.linearRampToValueAtTime(0.1, time + 0.3);
                    gain.gain.linearRampToValueAtTime(0.0, time + booDuration);
                    osc.start(time);
                    osc.stop(time + booDuration);
                }
                break;
            }
            case 'ability': playNote(987.77, time, 0.3, 0.3); playNote(1318.51, time + 0.05, 0.3, 0.3); break;
        }
    }, [isMuted]);

    const initAudio = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    };

    useEffect(() => {
        // Start timer only when in rapid round
        if (gameState === 'RAPID_ROUND') {
            timerRef.current = setInterval(() => {
                setTimerValue(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        // Cleanup: clear interval when gameState changes or component unmounts
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [gameState]);

    useEffect(() => {
        // Handle timer running out
        if (gameState === 'RAPID_ROUND' && timerValue <= 0) {
            playSound('accused');
            const nextIndex = rapidRoundIndex + 1;
            if (nextIndex < players.length) {
                setRapidRoundIndex(nextIndex);
                setGameState('RAPID_ROUND_TRANSITION');
            } else {
                setCurrentPlayerIndex(0);
                setGameState('VOTING');
            }
        }
    }, [gameState, timerValue, rapidRoundIndex, players, playSound]);
    
    useEffect(() => {
        // When a new rapid round turn starts, pick a random target
        if (gameState === 'RAPID_ROUND' && rapidRoundOrder.length > 0) {
            const askerName = rapidRoundOrder[rapidRoundIndex];
            // Find who the asker originally asked to avoid asking them again
            const originalTurn = questionTurns.find(t => t.asker === askerName);
            const originalTargetName = originalTurn?.target;
    
            // Potential targets are anyone except the asker and their original target
            const potentialTargets = players.filter(p => p.name !== askerName && p.name !== originalTargetName);
            
            let target: Player | undefined;
            if (potentialTargets.length > 0) {
                target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            } else {
                // Fallback for smaller games where only one other player exists
                const fallbackTargets = players.filter(p => p.name !== askerName);
                if (fallbackTargets.length > 0) {
                    target = fallbackTargets[Math.floor(Math.random() * fallbackTargets.length)];
                }
            }
            setRapidRoundTarget(target || null);
        }
    }, [gameState, rapidRoundIndex, players, rapidRoundOrder, questionTurns]);


    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);
    
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light')) {
            setTheme(savedTheme as 'light' | 'dark');
        } else if (prefersDark) {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        try {
            localStorage.setItem('theme', theme);
        } catch (e) {
            console.error("Failed to save theme to localStorage", e);
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
        playSound('next');
    };

    // Load custom categories from localStorage on mount
    useEffect(() => {
        try {
            const savedCategories = localStorage.getItem('spyGameCustomCategories');
            if (savedCategories) {
                setCustomCategories(JSON.parse(savedCategories));
            }
        } catch (error) {
            console.error("Failed to load custom categories from localStorage", error);
        }
    }, []);

    // Save custom categories to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('spyGameCustomCategories', JSON.stringify(customCategories));
        } catch (error) {
            console.error("Failed to save custom categories to localStorage", error);
        }
    }, [customCategories]);

    const generateGameData = useCallback(async (playerNames: string[], category: string, mode: 'SINGLE' | 'RANDOM') => {
        setError('');
        setIsLoading(true);

        try {
            const shuffledPlayers = [...playerNames].sort(() => Math.random() - 0.5);
            let numSpies = 1;
            if (mode === 'RANDOM' && playerNames.length >= 6) {
                numSpies = Math.random() > 0.5 ? 2 : 1;
            }
            const newSpies = shuffledPlayers.slice(0, numSpies);
            setSpies(newSpies);


            if (gameMode === 'WOLF') {
                 const wordsSchema = {
                    type: Type.OBJECT,
                    properties: {
                        citizenWord: { type: Type.STRING },
                        wolfWord: { type: Type.STRING },
                    },
                    required: ["citizenWord", "wolfWord"],
                };
                const wordsPrompt = `Generate two very similar but distinct secret words for a "Wolf of Words" game in Arabic. The words should be common nouns. For example: "شمس" (Sun) and "نجم" (Star), or "نهر" (River) and "بحيرة" (Lake). Return them as a JSON object with keys "citizenWord" and "wolfWord". Do not add any extra text.`;
                const wordsResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: wordsPrompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: wordsSchema,
                    },
                });
                const words = JSON.parse(wordsResponse.text);
                setTopic(words.citizenWord);
                setWolfWord(words.wolfWord);

            } else { // SPY MODE
                let newTopic = '';
                let topicList: string[] = [];

                const customCategory = customCategories.find(c => c.name === category);

                if (customCategory) {
                    topicList = customCategory.words;
                } else {
                    switch (category) {
                        case 'حيوانات': topicList = animal_category; break;
                        case 'أكلات': topicList = foods_category; break;
                        case 'مسلسلات عربية': topicList = shows_category; break;
                        case 'أبطال خارقين': topicList = superheroes_category; break;
                        case 'ألعاب فيديو': topicList = games_category; break;
                        case 'أماكن الرجمة': topicList = places_al_rajma; break;
                    }
                }

                if (topicList.length > 0) {
                    newTopic = topicList[Math.floor(Math.random() * topicList.length)];
                } else {
                    const topicPrompt = `اقترح كلمة سرية واحدة للعبة جاسوس. يجب أن تكون الكلمة اسمًا شائعًا أو اسم علم معروف على نطاق واسع في الثقافة العربية أو العالمية. أمثلة: "بيتزا"، "كرة السلة"، "سوبر ماريو"، "الأسد الملك"، "برج إيفل". لا تضف أي نصوص إضافية أو علامات اقتباس، فقط الكلمة.`;
                    
                    const topicResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: topicPrompt,
                    });
                    newTopic = topicResponse.text.trim();
                }
                setTopic(newTopic);
            }
            
            setGameState('ROLE_REVEAL');
        } catch (e: any) {
            setError('فشل بدء اللعبة. يرجى التحقق من مفتاح API والمحاولة مرة أخرى.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [ai, gameMode, customCategories]);

    const handleAddPlayer = () => {
        const newPlayerName = playerInput.trim();
        if (newPlayerName && !players.some(p => p.name === newPlayerName)) {
            if (players.length < 8) {
                setPlayers([...players, { name: newPlayerName, score: 0, crowns: 0, avatar: selectedAvatar }]);
                setPlayerInput('');
                setIsAddingPlayer(false);
                setError('');
                playSound('addPlayer');
            } else {
                setError('لا يمكن إضافة أكثر من 8 لاعبين.');
                setIsAddingPlayer(false);
            }
        }
    };

    const handleRemovePlayer = (playerToRemove: string) => {
        setPlayers(players.filter(p => p.name !== playerToRemove));
        playSound('removePlayer');
    };
    
    const handleStartGame = (mode: 'SINGLE' | 'RANDOM' = 'SINGLE') => {
        if (players.length < 3 || players.length > 8) {
            setError('الرجاء إدخال 3 إلى 8 أسماء لاعبين.');
            return;
        }

        playSound('startGame');
        setSpyCountMode(mode);

        const playerNames = players.map(p => p.name);
        const shuffledPlayerNames = [...playerNames].sort(() => Math.random() - 0.5);
        const newTurns = shuffledPlayerNames.map((p, i) => ({
            asker: p,
            target: shuffledPlayerNames[(i + 1) % shuffledPlayerNames.length]
        }));
        setQuestionTurns(newTurns);

        setCurrentPlayerIndex(0);
        setVotes({});
        setResults([]);
        setAccusedPlayer(null);
        setSpyGuessResults({});
        setAbilityUsedMessage('');
        setAbilityAsker('');
        setAbilityTarget('');
        setAbilityUsedThisRound([]);
        setWolfWord('');
        generateGameData(players.map(p => p.name), selectedCategory, mode);
    };

    const handleInitiateStart = () => {
        if (players.length >= 6 && gameMode === 'SPY') {
            playSound('next');
            setGameState('SPY_COUNT_SETUP');
        } else {
            handleStartGame('SINGLE');
        }
    };

    const handleNextPlayer = () => {
        playSound('next');
        setIsRoleVisible(false);

        setTimeout(() => {
            if (currentPlayerIndex < players.length - 1) {
                setCurrentPlayerIndex(prev => prev + 1);
            } else {
                setCurrentPlayerIndex(0);
                if (gameState === 'ROLE_REVEAL') {
                    setGameState('QUESTION_TURN');
                }
            }
        }, 300);
    };
    
    const handleNextQuestionTurn = () => {
        playSound('next');
        if (currentPlayerIndex < questionTurns.length - 1) {
            setCurrentPlayerIndex(prev => prev + 1);
        } else {
            // Last player finished, now show options for voting or rapid round.
            // The UI will handle the button display, this function just advances the index.
            setCurrentPlayerIndex(prev => prev + 1);
        }
    };
    
    const handleToggleVote = (votedFor: string) => {
        playSound('vote');
        setVotedPlayers(prev => {
            const maxVotes = spyCountMode === 'RANDOM' ? 2 : 1;
            if (prev.includes(votedFor)) {
                return prev.filter(p => p !== votedFor);
            }
            if (prev.length < maxVotes) {
                return [...prev, votedFor];
            }
            return prev;
        });
    };
    
    const handleConfirmVotes = () => {
        playSound('submit');
        const voter = players[currentPlayerIndex];
        const newVotes = { ...votes, [voter.name]: votedPlayers };
        setVotes(newVotes);
        setVotedPlayers([]);

        if (currentPlayerIndex < players.length - 1) {
            setCurrentPlayerIndex(prev => prev + 1);
        } else {
            handleSubmitVotes(newVotes);
        }
    };

    const generateSpyGuessOptions = async () => {
        setIsLoading(true);
        let options: string[] = [];
    
        let topicList: string[] = [];
        const customCategory = customCategories.find(c => c.name === selectedCategory);
        if (customCategory) {
            topicList = customCategory.words;
        } else {
            switch (selectedCategory) {
                case 'حيوانات': topicList = animal_category; break;
                case 'أكلات': topicList = foods_category; break;
                case 'مسلسلات عربية': topicList = shows_category; break;
                case 'أبطال خارقين': topicList = superheroes_category; break;
                case 'ألعاب فيديو': topicList = games_category; break;
                case 'أماكن الرجمة': topicList = places_al_rajma; break;
            }
        }

        if (topicList.length > 0) {
            const decoys = topicList.filter(t => t !== topic);
            const shuffledDecoys = decoys.sort(() => 0.5 - Math.random());
            options = [topic, ...shuffledDecoys.slice(0, 7)];
        } else { // For 'عشوائي' category
            const decoysPrompt = `The secret word is "${topic}". Generate 7 other similar but incorrect words that could be used as decoys in a spy game. The words should be in the same general category as "${topic}". Return them as a JSON array of strings. Example: if word is "Apple", return ["Banana", "Orange", ...].`;
            const decoySchema = { type: Type.ARRAY, items: { type: Type.STRING } };
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: decoysPrompt,
                config: { responseMimeType: "application/json", responseSchema: decoySchema },
            });
            const decoys = JSON.parse(response.text);
            options = [topic, ...decoys];
        }
    
        setSpyGuessOptions(options.sort(() => 0.5 - Math.random()));
        setIsLoading(false);
    };

    const handleSubmitVotes = (finalVotes: Votes) => {
        const voteCounts: { [key: string]: number } = {};
        players.forEach(p => { voteCounts[p.name] = 0; });
        const allVotes = Object.values(finalVotes).flat();
        allVotes.forEach(votedFor => {
            if (votedFor && voteCounts.hasOwnProperty(votedFor)) {
                voteCounts[votedFor]++;
            }
        });
    
        const maxVotes = Math.max(...Object.values(voteCounts));
        const mostVotedPlayers = Object.keys(voteCounts).filter(p => voteCounts[p] === maxVotes && maxVotes > 0);
        
        const accused = mostVotedPlayers.length > 0 ? mostVotedPlayers[0] : players.map(p => p.name).filter(name => !finalVotes[name])[0] || "No one";

        if (!accused) {
            setError("لم يصوت أحد. لا يمكن المتابعة.");
            return;
        }
        
        playSound('submit');
        setAccusedPlayer(accused);
        
        const roundResults = players.map(player => {
            const playerVotes = finalVotes[player.name] || [];
            let points = 0;
            let correctVote = false;

            if (!spies.includes(player.name)) {
                if (spyCountMode === 'RANDOM') {
                     let correctVotes = 0;
                     let incorrectVotes = 0;
                     playerVotes.forEach(vote => {
                        if (spies.includes(vote)) {
                            correctVotes++;
                        } else {
                            incorrectVotes++;
                        }
                    });
                    points = (correctVotes * 100) - (incorrectVotes * 100);
                    correctVote = correctVotes > 0 && incorrectVotes === 0 && playerVotes.length > 0;
                } else {
                    const vote = playerVotes[0] || '';
                    correctVote = spies.includes(vote);
                    points = correctVote ? 100 : -50;
                }
            }
            return {
                player: player.name,
                vote: playerVotes.join(', ') || 'لم يصوّت',
                correct: correctVote,
                pointsGained: points,
            };
        });
        setResults(roundResults);
    
        setGameState('RESULTS_REVEAL');
    };
    
    const handleRevealComplete = () => {
        if (gameMode === 'WOLF') {
            const wolfWasCaught = accusedPlayer === spies[0];
            const updatedPlayers = players.map(p => {
                let pointsForThisRound = 0;
                if (wolfWasCaught) {
                    if (!spies.includes(p.name)) {
                        pointsForThisRound = 200;
                    }
                } else {
                    if (spies.includes(p.name)) {
                        pointsForThisRound = 300;
                    }
                }
                 const newScore = p.score + pointsForThisRound;
                 const newCrowns = Math.floor(Math.max(0, newScore) / 1000);
                 return { ...p, score: newScore, crowns: newCrowns };
            });
            setPlayers(updatedPlayers);
            setGameState('RESULTS');
        } else { // SPY MODE
            generateSpyGuessOptions();
            setGameState('RESULTS');
        }
    };

    const handleSpyGuess = (guess: string, guessers: string | string[]) => {
        const isCorrect = guess === topic;
        playSound(isCorrect ? 'guessCorrect' : 'guessIncorrect');
        
        setGuessAnimationState({ guess, status: isCorrect ? 'correct' : 'incorrect' });

        setTimeout(() => {
            const newGuessResult = { choice: guess, correct: isCorrect, points: 0 };
            const newSpyGuessResults = { ...spyGuessResults };
    
            const escapedSpiesList = Array.isArray(guessers) ? guessers : [guessers];
            escapedSpiesList.forEach(guesser => {
                newSpyGuessResults[guesser] = newGuessResult;
            });
            
            setSpyGuessResults(newSpyGuessResults);
        
            const caughtSpies = spies.filter(s => s === accusedPlayer);
            const escapedSpies = spies.filter(s => s !== accusedPlayer);
            const allEscapedHaveGuessed = escapedSpies.every(s => newSpyGuessResults[s]);
        
            if (allEscapedHaveGuessed) {
                const finalResults = [...results];
                const updatedPlayers = players.map(p => {
                    let pointsForThisRound = 0;
        
                    if (spies.includes(p.name)) {
                        const wasCaught = caughtSpies.includes(p.name);
                        pointsForThisRound = wasCaught ? 0 : 200;
                        
                        const myGuessResult = newSpyGuessResults[p.name];
                        if (myGuessResult && myGuessResult.correct) {
                            pointsForThisRound += 250;
                        }
                    } else { // It's a citizen
                        const playerResult = finalResults.find(r => r.player === p.name);
                        if (playerResult) {
                            pointsForThisRound = playerResult.pointsGained;
                            // Check for ability refund
                            if (abilityUsedThisRound.includes(p.name) && playerResult.correct) {
                                pointsForThisRound += 200;
                                // Mark the result for UI feedback
                                const resultIndex = finalResults.findIndex(r => r.player === p.name);
                                if (resultIndex !== -1) {
                                    finalResults[resultIndex] = { ...finalResults[resultIndex], abilityRefund: true };
                                }
                            }
                        }
                    }
                    
                    const newScore = p.score + pointsForThisRound;
                    const newCrowns = Math.floor(Math.max(0, newScore) / 1000);
                    return { ...p, score: newScore, crowns: newCrowns };
                });
                setPlayers(updatedPlayers);
                setResults(finalResults);
            }
             setGuessAnimationState({ guess: null, status: null });
        }, 2500);
    };
    
    const handleNewRound = () => {
        playSound('next');
        const playerNames = players.map(p => p.name);
        const shuffledPlayerNames = [...playerNames].sort(() => Math.random() - 0.5);
        const newTurns = shuffledPlayerNames.map((p, i) => ({
            asker: p,
            target: shuffledPlayerNames[(i + 1) % shuffledPlayerNames.length]
        }));
        setQuestionTurns(newTurns);

        setCurrentPlayerIndex(0);
        setIsRoleVisible(false);
        setAccusedPlayer(null);
        setSpyGuessResults({});
        setAbilityUsedMessage('');
        setAbilityAsker('');
        setAbilityTarget('');
        setAbilityUsedThisRound([]);
        setWolfWord('');
        setShowVoteDetails(false);
        setGuessAnimationState({ guess: null, status: null });
        
        if (players.length >= 6 && gameMode === 'SPY') {
             setGameState('SPY_COUNT_SETUP');
        } else {
            handleStartGame(spyCountMode);
        }
    };

    const handleStartRapidRound = () => {
        playSound('startGame');
        const shuffledPlayers = [...players].map(p => p.name).sort(() => Math.random() - 0.5);
        setRapidRoundOrder(shuffledPlayers);
        setRapidRoundIndex(0);
        setGameState('RAPID_ROUND_TRANSITION');
    };

    const handleSkipRapidRoundTurn = () => {
        playSound('next');
        const nextIndex = rapidRoundIndex + 1;
        if (nextIndex < players.length) {
            setRapidRoundIndex(nextIndex);
            setGameState('RAPID_ROUND_TRANSITION');
        } else {
            setCurrentPlayerIndex(0);
            setGameState('VOTING');
        }
    };

    const handleUseExtraQuestion = () => {
        if (!abilityAsker || !abilityTarget) return;

        const asker = players.find(p => p.name === abilityAsker);
        if (asker && asker.score >= 200) {
            playSound('ability');
            const updatedPlayers = players.map(p =>
                p.name === abilityAsker ? { ...p, score: p.score - 200 } : p
            );
            setPlayers(updatedPlayers);
            setAbilityUsedThisRound([...abilityUsedThisRound, abilityAsker]);
            setAbilityUsedMessage(`✅ ${abilityAsker} استخدم 200 نقطة ليسأل ${abilityTarget}!`);
            setTimeout(() => setAbilityUsedMessage(''), 4000);
            setAbilityAsker('');
            setAbilityTarget('');
        }
    };

    const confirmEndRound = () => {
        playSound('removePlayer');
        setGameState(gameMode === 'SPY' ? 'SETUP' : 'PLAYER_SETUP');
        setTopic('');
        setWolfWord('');
        setSpies([]);
        setVotes({});
        setResults([]);
        setCurrentPlayerIndex(0);
        setIsRoleVisible(false);
        setError('');
        setSpyGuessOptions([]);
        setSpyGuessResults({});
        setAccusedPlayer(null);
        setAbilityUsedThisRound([]);
        setAbilityAsker('');
        setAbilityTarget('');
        setAbilityUsedMessage('');
        setIsBackConfirmVisible(false);
        setQuestionTurns([]);
        setShowVoteDetails(false);
    };

    const cancelEndRound = () => {
        playSound('next');
        setIsBackConfirmVisible(false);
    };

    const handleBack = () => {
        playSound('next');
        if (['ROLE_REVEAL', 'QUESTION_TURN', 'VOTING', 'RAPID_ROUND', 'RAPID_ROUND_TRANSITION'].includes(gameState)) {
            setIsBackConfirmVisible(true);
        } else if (gameState === 'PLAYER_SETUP' || gameState === 'SPY_COUNT_SETUP') {
            if (gameMode === 'SPY') {
                setGameState('SETUP');
            } else {
                setGameState('MAIN_MENU');
                setPlayers([]);
                setPlayerInput('');
                setError('');
            }
        } else if (gameState === 'SETUP') {
            setGameState('MAIN_MENU');
            setPlayers([]);
            setPlayerInput('');
            setError('');
        }
    };
    
    const handleSaveCategory = () => {
        const name = newCategoryName.trim();
        const words = newCategoryWords.split('\n').map(w => w.trim()).filter(Boolean);
        const isNameDuplicate = categories.some(c => c.name === name) || customCategories.some(c => c.name === name);

        if (name && words.length >= 8 && !isNameDuplicate) {
            setCustomCategories([...customCategories, { name, words }]);
            playSound('addPlayer');
            setCategoryCreationState('success');
            
            setTimeout(() => {
                setIsCreateCategoryModalOpen(false);
                setNewCategoryName('');
                setNewCategoryWords('');
                setCategoryCreationState('idle');
            }, 1500);

        } else {
            playSound('removePlayer');
        }
    };

    const handleDeleteCategory = (nameToDelete: string) => {
        setCustomCategories(prevCategories => prevCategories.filter(c => c.name !== nameToDelete));
        if (selectedCategory === nameToDelete) {
            setSelectedCategory('عشوائي');
        }
        playSound('removePlayer');
    };

    const renderBackButton = () => {
        if (gameState === 'MAIN_MENU' || gameState === 'RESULTS_REVEAL' || gameState === 'RESULTS') {
            return null;
        }

        return (
            <button className="control-btn back-btn" onClick={handleBack} aria-label="رجوع">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
        );
    };

    const renderMainMenu = () => (
        <div className="card main-menu-card">
            <h3>اختر نمط اللعبة</h3>
            <p className="text-muted" style={{marginBottom: "2rem"}}>المزيد من الأنماط قادمة قريباً!</p>
            <div className="mode-selection-container">
                <button
                    className={`mode-btn ${gameMode === 'SPY' ? 'active' : ''}`}
                    onClick={() => {
                        initAudio();
                        playSound('modeSelect');
                        setGameMode('SPY');
                        setGameState('SETUP');
                    }}
                >
                    <h4>برا السالفة</h4>
                    <p>اكتشف الجاسوس الذي لا يعرف الكلمة السرية.</p>
                </button>
                <button 
                    className={`mode-btn ${gameMode === 'WOLF' ? 'active' : ''}`}
                    onClick={() => {
                        initAudio();
                        playSound('modeSelect');
                        setGameMode('WOLF');
                        setGameState('PLAYER_SETUP');
                    }}
                >
                    <h4>ذئب الكلمات</h4>
                    <p>صوّت ضد اللاعب الذي لديه كلمة مختلفة.</p>
                </button>
            </div>
        </div>
    );
    
    const renderAddPlayerModal = () => {
        if (!isAddingPlayer) return null;
        
        return (
            <div className="modal-overlay">
                <div className="modal-content card add-player-modal-content">
                    <h3>إضافة لاعب</h3>
                    <div className="form-section">
                        <label className="form-label">اختر صورة رمزية</label>
                        <div className="avatar-grid">
                            {avatars.map((avatar, index) => (
                                <button
                                    key={index}
                                    className={`avatar-option ${selectedAvatar === index ? 'selected' : ''}`}
                                    onClick={() => setSelectedAvatar(index)}
                                    aria-label={`Avatar ${index + 1}`}
                                >
                                    {avatar}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div className="form-section">
                        <label className="form-label">اسم اللاعب</label>
                        <input
                            type="text"
                            value={playerInput}
                            onChange={(e) => setPlayerInput(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
                            placeholder="أدخل اسم اللاعب"
                            aria-label="اسم اللاعب"
                        />
                    </div>
                    <div className="button-group">
                        <button className="btn" onClick={handleAddPlayer} disabled={!playerInput.trim()}>إضافة اللاعب</button>
                        <button className="btn btn-secondary" onClick={() => { setIsAddingPlayer(false); setPlayerInput('')}}>إلغاء</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderCreateCategoryModal = () => {
        if (!isCreateCategoryModalOpen) return null;

        const wordsArray = newCategoryWords.split('\n').map(w => w.trim()).filter(Boolean);
        const wordCount = wordsArray.length;
        const trimmedName = newCategoryName.trim();

        const isNameEmpty = !trimmedName;
        const isNameDuplicate = categories.some(c => c.name === trimmedName) || customCategories.some(c => c.name === trimmedName);
        const areWordsInsufficient = wordCount < 8;

        const canSave = !isNameEmpty && !isNameDuplicate && !areWordsInsufficient;
    
        return (
            <div className="modal-overlay">
                <div className="modal-content card create-category-modal">
                    {categoryCreationState === 'success' ? (
                        <div className="category-success-view">
                            <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                                <circle className="success-checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                                <path className="success-checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                            </svg>
                            <h3>تم الحفظ بنجاح!</h3>
                            <p>تمت إضافة فئتك الجديدة.</p>
                        </div>
                    ) : (
                        <>
                            <h3>إنشاء فئة جديدة</h3>
                            <div className="form-section">
                                <label className="form-label">اسم الفئة</label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="مثال: شخصيات كرتونية"
                                    maxLength={20}
                                />
                                <div className="modal-validation-error">
                                    {isNameEmpty ? 'اسم الفئة مطلوب.' : isNameDuplicate ? 'هذا الاسم مستخدم بالفعل.' : ''}
                                </div>
                            </div>
                            <div className="form-section">
                                <div className="form-label-container">
                                    <label className="form-label">قائمة الكلمات ({wordCount}/8+)</label>
                                    <div className="word-count-indicator">
                                        {Array.from({ length: 8 }).map((_, index) => (
                                            <div key={index} className={`word-count-dot ${index < Math.min(wordCount, 8) ? 'filled' : ''}`}></div>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    value={newCategoryWords}
                                    onChange={(e) => setNewCategoryWords(e.target.value)}
                                    placeholder="أدخل كلمة واحدة في كل سطر.&#10;8 كلمات على الأقل."
                                />
                                <div className="modal-validation-error">
                                    {areWordsInsufficient && wordCount > 0 ? `تحتاج إلى ${8 - wordCount} كلمات إضافية.` : ''}
                                </div>
                            </div>
                            <div className="button-group">
                                <button className="btn" onClick={handleSaveCategory} disabled={!canSave}>حفظ وتثبيت</button>
                                <button className="btn btn-secondary" onClick={() => { setIsCreateCategoryModalOpen(false); setNewCategoryName(''); setNewCategoryWords(''); setCategoryCreationState('idle'); }}>إلغاء</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const SelectedIndicator = () => (
        <div className="category-selected-indicator" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    );

    const renderSetup = () => {
        return (
            <div className="card">
                <h3>إعدادات لعبة برا السالفة</h3>
                <p className="text-muted" style={{marginBottom: "2rem"}}>
                    الخطوة 1: اختر فئة للكلمة السرية.
                </p>
                
                <div className="form-section">
                    <label className="form-label">اختر الفئة</label>
                    <div className="category-selector">
                        {categories.map(cat => (
                            <button 
                                key={cat.name}
                                className={`category-btn ${selectedCategory === cat.name ? 'active' : ''}`}
                                onClick={() => { playSound('categorySelect'); setSelectedCategory(cat.name); }}
                            >
                                {selectedCategory === cat.name && <SelectedIndicator />}
                                <span className="category-name">{cat.name}</span>
                            </button>
                        ))}
                         {customCategories.map(cat => (
                            <div key={cat.name} className="category-btn-wrapper">
                                <button
                                    className={`category-btn custom ${selectedCategory === cat.name ? 'active' : ''}`}
                                    onClick={() => { playSound('categorySelect'); setSelectedCategory(cat.name); }}
                                >
                                    {selectedCategory === cat.name && <SelectedIndicator />}
                                    <span className="category-name">{cat.name}</span>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.name); }} 
                                    className="delete-category-btn" 
                                    aria-label={`حذف فئة ${cat.name}`}
                                >×</button>
                            </div>
                        ))}
                        <button className="category-btn add-category-btn" onClick={() => { setIsCreateCategoryModalOpen(true); setCategoryCreationState('idle'); }}>
                            <span className="category-name">أضف فئة</span>
                        </button>
                    </div>
                </div>

                <div className="button-group">
                    <button 
                        className="btn" 
                        onClick={() => { playSound('next'); setGameState('PLAYER_SETUP'); }}
                    >
                        التالي
                    </button>
                </div>
            </div>
        );
    };
    
    const renderSpyCountSetup = () => (
        <div className="card">
            <h3>عدد الجواسيس</h3>
            <p className="text-muted" style={{marginBottom: "2rem"}}>
                بما أن عدد اللاعبين 6 أو أكثر، يمكنكم اختيار عدد الجواسيس لهذه الجولة.
            </p>
            <div className="mode-selection-container">
                <button
                    className="mode-btn"
                    onClick={() => handleStartGame('SINGLE')}
                >
                    <h4>جاسوس واحد</h4>
                    <p>الطريقة الكلاسيكية للعب. جاسوس واحد فقط يتخفى بينكم.</p>
                </button>
                <button
                    className="mode-btn"
                    onClick={() => handleStartGame('RANDOM')}
                >
                    <h4>عشوائي (1 أو 2)</h4>
                    <p>تحدٍ أكبر! قد يكون هناك جاسوس واحد أو اثنان. هل يمكنك كشفهم جميعاً؟</p>
                </button>
            </div>
        </div>
    );

    const renderPlayerSetup = () => {
        return (
            <div className="card">
                {renderAddPlayerModal()}
                <h3>إعدادات لعبة {gameMode === 'SPY' ? 'برا السالفة' : 'ذئب الكلمات'}</h3>
                <p className="text-muted" style={{marginBottom: "2rem"}}>
                    {gameMode === 'SPY' ? `الخطوة 2: أضف اللاعبين. (الفئة: ${selectedCategory})` : 'أضف من 3 إلى 8 لاعبين.'}
                </p>

                <div className="form-section">
                    <label className="form-label">اللاعبون ({players.length}/8)</label>
                    <div className="player-list-setup">
                        {players.map(player => (
                            <div key={player.name} className="player-tag">
                                <div className="player-avatar-container">{avatars[player.avatar]}</div>
                                <div className="player-info">
                                    <span>{player.name}</span>
                                    <div className="player-score-container">
                                        <span>🏆 {player.crowns}</span>
                                        <span>{player.score} نقطة</span>
                                    </div>
                                </div>
                                <button onClick={() => handleRemovePlayer(player.name)} className="remove-player-btn" aria-label={`إزالة ${player.name}`}>×</button>
                            </div>
                        ))}
                         {players.length < 8 && (
                            <button className="add-player-btn" onClick={() => { setSelectedAvatar(Math.floor(Math.random() * avatars.length)); setIsAddingPlayer(true); }}>
                                +
                            </button>
                        )}
                    </div>
                </div>
                
                <button 
                    className="btn" 
                    onClick={handleInitiateStart} 
                    disabled={players.length < 3}
                >
                    ابدأ اللعبة
                </button>
            </div>
        );
    };

    const renderRevealScreen = () => {
        const currentPlayerName = players[currentPlayerIndex]?.name;
    
        const renderRoleContent = () => {
            if (gameMode === 'WOLF') {
                return (
                    spies.includes(currentPlayerName) ? (
                        <>
                            <h4 className="role-title spy-role">أنت الذئب!</h4>
                            <div className="secret-word-container">
                                <p className="secret-word-label">كلمتك السرية هي</p>
                                <p className="secret-word-text">{wolfWord}</p>
                            </div>
                            <p className="spy-instructions">كلمة المواطنين مشابهة. حاول التخفي!</p>
                        </>
                    ) : (
                        <>
                            <h4 className="role-title citizen-role">أنت مواطن</h4>
                            <div className="secret-word-container">
                                <p className="secret-word-label">الكلمة السرية هي</p>
                                <p className="secret-word-text">{topic}</p>
                            </div>
                        </>
                    )
                );
            } else { // SPY MODE
                return (
                    spies.includes(currentPlayerName) ? (
                        <>
                            <h4 className="role-title spy-role">أنت الجاسوس!</h4>
                            <p className="spy-instructions">مهمتك: اكتشف الكلمة السرية وحاول خداع اللاعبين الآخرين دون أن يتم كشفك.</p>
                        </>
                    ) : (
                        <>
                            <h4 className="role-title citizen-role">أنت مواطن</h4>
                             <div className="secret-word-container">
                                <p className="secret-word-label">الكلمة السرية هي</p>
                                <p className="secret-word-text">{topic}</p>
                            </div>
                        </>
                    )
                );
            }
        };
    
        return (
            <div className="card">
                <h3>كشف الأدوار</h3>
                <div className="player-turn-indicator">
                    <p>مرر الجهاز إلى</p>
                    <div className="player-name-display">{currentPlayerName}</div>
                </div>
                
                <div className={`flip-card ${isRoleVisible ? 'flipped' : ''}`}>
                    <div className="flip-card-inner">
                        <div className="flip-card-back">
                            <button className="btn" onClick={() => { setIsRoleVisible(true); playSound('reveal'); }}>
                               أظهر دوري
                            </button>
                        </div>
                        <div className="flip-card-front">
                            <div className="role-reveal-content">
                                {renderRoleContent()}
                                <button className="btn btn-secondary" onClick={handleNextPlayer} style={{marginTop: 'auto'}}>
                                    {currentPlayerIndex === players.length - 1 ? 'ابدأ الأسئلة' : 'اللاعب التالي'}
                               </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderQuestionTurn = () => {
        const isLastTurn = currentPlayerIndex >= questionTurns.length;
    
        if (isLastTurn) {
            return (
                <div className="card">
                    <h3>اكتملت الأسئلة</h3>
                    <p className="text-muted" style={{margin: '1rem 0 2rem'}}>
                        اكتملت الجولة الأساسية من الأسئلة. يمكنكم الآن الانتقال مباشرة إلى التصويت أو بدء جولة سريعة ومكثفة!
                    </p>
                    <div className="button-group">
                        <button className="btn" onClick={() => { playSound('next'); setCurrentPlayerIndex(0); setGameState('VOTING'); }}>
                            الانتقال إلى التصويت
                        </button>
                        <button className="btn btn-secondary" onClick={handleStartRapidRound}>
                            بدء جولة سريعة
                        </button>
                    </div>
                </div>
            );
        }

        const currentTurn = questionTurns[currentPlayerIndex];
        if (!currentTurn) {
            return <div className="loader"></div>;
        }

        const { asker, target } = currentTurn;
        const askerPlayer = players.find(p => p.name === asker);
        const targetPlayer = players.find(p => p.name === target);
        const playersWithPoints = players.filter(p => p.score >= 200 && !abilityUsedThisRound.includes(p.name));
    
        if (!askerPlayer || !targetPlayer) {
            return <div className="loader"></div>;
        }
    
        return (
            <div className="card">
                <h3>مرحلة الأسئلة</h3>
                <p className="turn-indicator">الدور {currentPlayerIndex + 1} / {questionTurns.length}</p>
    
                <div className="question-turn-display">
                    <div className="player-focus-card asker">
                        <span className="focus-label">السائل</span>
                        <div className="player-avatar-container large">{avatars[askerPlayer.avatar]}</div>
                        <span className="player-name-text">{askerPlayer.name}</span>
                    </div>
                    <div className="player-focus-card target">
                        <span className="focus-label">المستهدف</span>
                        <div className="player-avatar-container large">{avatars[targetPlayer.avatar]}</div>
                        <span className="player-name-text">{targetPlayer.name}</span>
                    </div>
                </div>

                <p className="question-instruction">
                    اللاعب <strong>{askerPlayer.name}</strong>، اسأل <strong>{targetPlayer.name}</strong> سؤالاً متعلقاً بالسالفة.
                </p>
    
                <div className="ability-section">
                    <h4>قدرات خاصة <span className="ability-cost">(التكلفة: 200 نقطة)</span></h4>
                    
                    <div className="ability-flow">
                        {!abilityAsker ? (
                            <div className="ability-step">
                                <label className="form-label">الخطوة 1: اختر من سيستخدم القدرة</label>
                                {playersWithPoints.length > 0 ? (
                                    <div className="ability-selection-grid">
                                        {playersWithPoints.map(p => (
                                            <button key={p.name} className="ability-player-btn" onClick={() => setAbilityAsker(p.name)}>
                                                <div className="player-avatar-container">{avatars[p.avatar]}</div>
                                                <span className="player-name-text">{p.name}</span>
                                                <span className="player-score-text">{p.score} نقطة</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted" style={{marginTop: '0.5rem', fontSize: '0.9rem', textAlign: 'right'}}>لا يوجد لاعبون يملكون نقاطًا كافية.</p>
                                )}
                            </div>
                        ) : (
                            <div className="ability-step">
                                 <label className="form-label">الخطوة 2: اختر المستهدف للسؤال</label>
                                 <div className="ability-selection-grid">
                                    {players.filter(p => p.name !== abilityAsker).map(p => (
                                        <button 
                                            key={p.name} 
                                            className={`ability-player-btn ${abilityTarget === p.name ? 'selected' : ''}`} 
                                            onClick={() => setAbilityTarget(p.name)}
                                        >
                                            <div className="player-avatar-container">{avatars[p.avatar]}</div>
                                            <span className="player-name-text">{p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
    
                    {abilityAsker && (
                         <div className="button-group" style={{justifyContent: 'flex-start', alignItems: 'center', marginTop: '1rem'}}>
                            <button 
                                className="btn" 
                                onClick={handleUseExtraQuestion} 
                                disabled={!abilityTarget}
                            >
                                استخدم القدرة
                            </button>
                            <button className="btn btn-secondary" onClick={() => {setAbilityAsker(''); setAbilityTarget('');}}>
                                إلغاء
                            </button>
                        </div>
                    )}
                    
                    {abilityUsedMessage && <div className="ability-message">{abilityUsedMessage}</div>}
                </div>
                
                <div className="button-group">
                    <button className="btn" onClick={handleNextQuestionTurn}>
                       السؤال التالي
                    </button>
                </div>
            </div>
        );
    };

    const renderRapidRoundTransition = () => {
        const currentPlayerName = rapidRoundOrder[rapidRoundIndex];
        const currentPlayer = players.find(p => p.name === currentPlayerName);

        if (!currentPlayer) return <div className="loader"></div>;

        return (
            <div className="card">
                <h3>جولة سريعة!</h3>
                <div className="player-turn-indicator">
                    <p>استعد يا</p>
                    <div className="player-name-display">{currentPlayer.name}</div>
                    <p style={{marginTop: '1rem'}}>لديك {RAPID_ROUND_DURATION} ثانية لتوجيه سؤال سريع!</p>
                </div>
                <button className="btn" onClick={() => {
                    setTimerValue(RAPID_ROUND_DURATION);
                    setGameState('RAPID_ROUND');
                    playSound('startGame');
                }}>
                    ابدأ دوري
                </button>
            </div>
        );
    };

    const renderRapidRound = () => {
        const askerName = rapidRoundOrder[rapidRoundIndex];
        const asker = players.find(p => p.name === askerName);
        const target = rapidRoundTarget;

        if (!asker || !target) return <div className="loader"></div>;

        return (
            <div className="card rapid-round-card">
                <h3>جولة سريعة: دور {asker.name}</h3>
                <TimerCircle duration={RAPID_ROUND_DURATION} timeRemaining={timerValue} />

                <div className="rapid-round-display">
                     <div className="player-focus-card asker">
                        <span className="focus-label">السائل</span>
                        <div className="player-avatar-container large">{avatars[asker.avatar]}</div>
                        <span className="player-name-text">{asker.name}</span>
                    </div>
                    <div className="player-focus-card target">
                        <span className="focus-label">المستهدف</span>
                        <div className="player-avatar-container large">{avatars[target.avatar]}</div>
                        <span className="player-name-text">{target.name}</span>
                    </div>
                </div>

                <p className="rapid-round-instruction">
                    لديك {timerValue} ثانية لتسأل <strong>{target.name}</strong> سؤالاً!
                </p>

                <div className="button-group">
                    <button className="btn btn-secondary btn-skip" onClick={handleSkipRapidRoundTurn}>
                        تخطى الدور
                    </button>
                </div>
            </div>
        );
    };


    const renderVoting = () => {
        const voter = players[currentPlayerIndex];
        if (!voter) return <div className="loader"></div>;
    
        const voteOptions = players.filter(p => p.name !== voter.name);
        const maxVotes = spyCountMode === 'RANDOM' ? 2 : 1;
    
        return (
            <div className="card">
                <h3>حان وقت التصويت!</h3>
                <div className="voter-spotlight">
                    دور <strong>{voter.name}</strong> للتصويت
                    <p style={{fontSize: '1rem', margin: '0.25rem 0 0', color: '#555'}}>
                        {maxVotes > 1 ? `يمكنك التصويت لما يصل إلى لاعبين اثنين.` : 'صوّت ضد لاعب واحد.'}
                    </p>
                </div>

                <div className="voting-stage">
                    {voteOptions.map(option => (
                        <button
                            key={option.name}
                            className={`vote-candidate-poster ${votedPlayers.includes(option.name) ? 'voted' : ''}`}
                            onClick={() => handleToggleVote(option.name)}
                        >
                            <div className="player-avatar-container large">{avatars[option.avatar]}</div>
                            <span className="player-name-text">{option.name}</span>
                            {votedPlayers.includes(option.name) && (
                                <div className="voted-stamp">تم التصويت</div>
                            )}
                        </button>
                    ))}
                </div>
                <div className="button-group">
                    <button className="btn" onClick={handleConfirmVotes} disabled={votedPlayers.length === 0}>
                        تأكيد التصويت
                    </button>
                </div>
            </div>
        );
    };
    
    const renderResults = () => {
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        const showConfetti = Object.values(spyGuessResults).some((r: any) => r.correct);
        const abilityRefunds = results.filter(r => r.abilityRefund);

        if (gameMode === 'WOLF') {
            const spy = spies[0] || '';
            const wolfWasCaught = accusedPlayer === spy;
            const wolfResultText = wolfWasCaught 
                ? `نجح المواطنون! لقد كشفوا الذئب!`
                : `لقد هرب الذئب! فشل المواطنون في كشفه.`;
            
            return (
                <div className="card">
                    <h3>النتائج</h3>
                    <h2 className="reveal-text" style={{margin: "1rem 0 2rem"}}>{wolfResultText}</h2>
                    <div className="result-card important-result" style={{marginBottom: "2rem"}}>
                        {wolfWasCaught ? (
                             <p>✅ تم التصويت ضد الذئب <strong>{spy}</strong>. فاز المواطنون بـ 200 نقطة!</p>
                        ) : (
                             <p>❌ تم التصويت ضد <strong>{accusedPlayer}</strong> بالخطأ. فاز الذئب <strong>{spy}</strong> بـ 300 نقطة!</p>
                        )}
                    </div>
                    <div className="results-grid">
                      <div className="result-card">
                        <p>كلمة المواطنين كانت: <strong>{topic}</strong></p>
                      </div>
                      <div className="result-card">
                        <p>كلمة الذئب كانت: <strong>{wolfWord}</strong></p>
                      </div>
                    </div>

                    <div className="leaderboard">
                        <h4>لوحة الصدارة</h4>
                        <ul className="leaderboard-list">
                            {sortedPlayers.map((p, index) => (
                                <li key={p.name}>
                                    <span>{index + 1}. {p.name}</span>
                                    <span>{p.score} نقطة | 🏆 {p.crowns}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="button-group">
                        <button className="btn" onClick={handleNewRound}>جولة جديدة</button>
                    </div>
                </div>
            )
        }

        const escapedSpies = spies.filter(s => s !== accusedPlayer);
        const spiesWhoHaventGuessed = escapedSpies.filter(s => !spyGuessResults[s]);
        const allSpiesGuessed = escapedSpies.length === 0 || spiesWhoHaventGuessed.length === 0;
        const isSharedGuess = spiesWhoHaventGuessed.length > 1;

        return (
            <div className={`card ${showConfetti ? 'has-particles' : ''}`}>
                {showConfetti && <ParticleEffect count={100} />}
                <h3>النتائج</h3>
                <h2 className="reveal-text" style={{margin: "1rem 0 2rem"}}>
                    {spies.length > 1 ? 'الجواسيس كانوا ' : 'الجاسوس كان '}
                    <span>{spies.join(' و ')}</span>!
                </h2>
                
                {Object.keys(spyGuessResults).length > 0 && Object.entries(spyGuessResults).map(([spyName, result]: [string, any]) => (
                     <div key={spyName} className={`result-card important-result ${result.correct ? 'correct' : 'incorrect'}`}>
                        <p>
                            الجاسوس <strong>{spyName}</strong> خمّن <strong>"{result.choice}"</strong>.
                            {result.correct ? " التخمين صحيح!" : ` التخمين خاطئ! الكلمة كانت "${topic}".`}
                        </p>
                    </div>
                ))}
                
                {!allSpiesGuessed && (
                    <div className="spy-guess-section">
                        <h4>
                            {isSharedGuess
                                ? `فرصة الجواسيس ${spiesWhoHaventGuessed.join(' و ')}!`
                                : `فرصة الجاسوس ${spiesWhoHaventGuessed[0]}!`
                            }
                        </h4>
                        <p>
                            {isSharedGuess
                                ? "لقد نجحتم في التخفي! تشاوروا وخمّنوا الكلمة السرية معاً لتحصلوا على نقاط إضافية."
                                : "لقد نجحت في التخفي! خمّن الكلمة السرية لتحصل على نقاط إضافية."
                            }
                        </p>
                        {isLoading ? <div className="loader"></div> : (
                            <div className="spy-guess-options">
                                {spyGuessOptions.map(option => {
                                    const isSelected = guessAnimationState.guess === option;
                                    const animationClass = isSelected ? (guessAnimationState.status === 'correct' ? 'correct-guess' : 'incorrect-guess') : '';
                                    const isFaded = guessAnimationState.guess !== null && !isSelected;

                                    return (
                                        <button 
                                            key={option} 
                                            className={`spy-guess-option-btn ${animationClass} ${isFaded ? 'faded' : ''}`}
                                            onClick={() => handleSpyGuess(option, isSharedGuess ? spiesWhoHaventGuessed : spiesWhoHaventGuessed[0])}
                                            disabled={guessAnimationState.guess !== null}
                                        >
                                            <span className="guess-text">{option}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                
                {allSpiesGuessed && (
                    <>
                        <div className="final-results-container">
                             {abilityRefunds.length > 0 && (
                                <div className="results-grid">
                                    {abilityRefunds.map(r => (
                                        <div className="result-card ability-refund" key={r.player}>
                                            <p>🎉 <strong>{r.player}</strong> استعاد 200 نقطة لتصويته الصحيح أثناء استخدام القدرة!</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showVoteDetails && (
                                <div className="results-grid">
                                    <h4>تفاصيل التصويت</h4>
                                    {results.map(r => {
                                        if (spies.includes(r.player)) return null;

                                        let pointDisplay = '';
                                        let basePoints = r.pointsGained - (r.abilityRefund ? 200 : 0);
                                        if (basePoints > 0) pointDisplay = `✅ (+${basePoints})`;
                                        else if (basePoints < 0) pointDisplay = `❌ (${basePoints})`;
                                        else pointDisplay = `(0)`;

                                        return (
                                            <div className="result-card" key={r.player}>
                                                <p><strong>{r.player}</strong> صوّت لـ <strong>{r.vote}</strong> {pointDisplay}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="leaderboard">
                                <h4>لوحة الصدارة</h4>
                                <ul className="leaderboard-list">
                                    {sortedPlayers.map((p, index) => (
                                        <li key={p.name}>
                                            <span>{index + 1}. {p.name}</span>
                                            <span>{p.score} نقطة | 🏆 {p.crowns}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="button-group">
                             {!showVoteDetails && (
                                <button className="btn btn-secondary" onClick={() => { playSound('next'); setShowVoteDetails(true); }}>
                                    عرض تفاصيل التصويت
                                </button>
                            )}
                            <button className="btn" onClick={handleNewRound}>جولة جديدة</button>
                        </div>
                    </>
                )}
            </div>
        )
    };
    
    const renderBackConfirmModal = () => {
        if (!isBackConfirmVisible) return null;

        return (
            <div className="modal-overlay">
                <div className="modal-content card">
                    <h3>إنهاء الجولة؟</h3>
                    <p>هل أنت متأكد أنك تريد إنهاء الجولة الحالية والعودة إلى شاشة الإعدادات؟</p>
                    <div className="button-group">
                        <button className="btn" onClick={confirmEndRound}>نعم، إنهاء</button>
                        <button className="btn btn-secondary" onClick={cancelEndRound}>إلغاء</button>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading && gameState !== 'RESULTS') return <div className="loader"></div>;
        if (error && gameState !== 'PLAYER_SETUP' && gameState !== 'MAIN_MENU') return <div className="error">{error}</div>;

        switch (gameState) {
            case 'MAIN_MENU': return renderMainMenu();
            case 'SETUP': return renderSetup();
            case 'PLAYER_SETUP': return renderPlayerSetup();
            case 'SPY_COUNT_SETUP': return renderSpyCountSetup();
            case 'ROLE_REVEAL': return renderRevealScreen();
            case 'QUESTION_TURN': return renderQuestionTurn();
            case 'RAPID_ROUND_TRANSITION': return renderRapidRoundTransition();
            case 'RAPID_ROUND': return renderRapidRound();
            case 'VOTING': return renderVoting();
            case 'RESULTS_REVEAL':
                 return accusedPlayer ? <ResultsRevealScreen 
                    players={players} 
                    accusedPlayer={accusedPlayer} 
                    spies={spies} 
                    onRevealComplete={handleRevealComplete}
                    gameMode={gameMode}
                    playSound={playSound}
                /> : <div className="loader"></div>;
            case 'RESULTS': return renderResults();
            default: return renderMainMenu();
        }
    };
    
    const isSetupState = ['SETUP', 'PLAYER_SETUP'].includes(gameState);
    const containerClasses = [
        'container',
        isSetupState ? 'theme-active' : '',
        isSetupState && selectedCategory === 'حيوانات' ? 'theme-animals' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            <div className="top-controls">
                 {renderBackButton()}
                <div className="top-right-controls">
                    <button
                        className="control-btn theme-toggle-btn"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                         <svg className="sun-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                         <svg className="moon-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    </button>
                    <button className="control-btn mute-btn" onClick={() => { playSound('next'); setIsMuted(!isMuted); }} aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}>
                        {isMuted ? 
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                            : 
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                        }
                    </button>
                </div>
            </div>
            {renderBackConfirmModal()}
            {renderCreateCategoryModal()}
            <header className="header">
                <h1>برا السالفة</h1>
                <h2>لعبة الجاسوس</h2>
            </header>
            <main>
                {renderContent()}
                 {error && gameState === 'PLAYER_SETUP' && <div className="error">{error}</div>}
            </main>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<React.StrictMode><App /></React.StrictMode>);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}