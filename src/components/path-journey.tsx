
"use client";

import { pathNodesData, PathNodeData, PathAction } from '@/lib/path-data';
import { Crown, FileCheck, GraduationCap, User, UserPlus, Users, X, LogIn, LogOut, Menu } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import * as Tone from 'tone';
import SignupModal from './modals/signup-modal';
import ChatbotModal from './modals/chatbot-modal';
import TutorialModal from './modals/tutorial-modal';
import FeedbackModal from './modals/feedback-modal';
import LinkModal from './modals/link-modal';
import CreateTribeModal from './modals/create-tribe-modal';
import JoinTribeModal from './modals/join-tribe-modal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import LoginModal from './modals/login-modal';
import { getUserProgress } from '@/ai/flows/get-user-progress';
import { updateUserProgress } from '@/ai/flows/update-user-progress';
import MenuSheet from './menu-sheet';

type SoundType = 'click' | 'locked' | 'progress' | 'hop' | 'complete' | 'action';

interface LinkModalData {
  title: string;
  url: string;
  requirementId: string | null;
}

const nodeIcons: { [key: string]: React.FC<any> } = {
  visitor: User,
  guest: UserPlus,
  graduate: GraduationCap,
  member: Users,
  chief: Crown,
  mentor: GraduationCap
};

const actionIcons: { [key: string]: React.FC<any> } = {
  'complete-tutorial': FileCheck,
};

export default function PathJourney() {
  const [currentUserLevel, setCurrentUserLevel] = useState(1);
  const [requirementsState, setRequirementsState] = useState<Record<string, boolean>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [justCompletedActionId, setJustCompletedActionId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showCurtain, setShowCurtain] = useState(true);
  const [logoZIndex, setLogoZIndex] = useState(201);
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const isGuest = currentUser !== null;

  const [modalState, setModalState] = useState({
    signup: false,
    login: false,
    chatbot: false,
    tutorial: false,
    feedback: false,
    link: false,
    createTribe: false,
    joinTribe: false,
    menu: false,
  });

  const [linkModalData, setLinkModalData] = useState<LinkModalData>({
    title: '',
    url: '',
    requirementId: null,
  });

  const pathRef = useRef<SVGPathElement>(null);
  const userIconRef = useRef<HTMLDivElement>(null);
  const pathContainerRef = useRef<HTMLDivElement>(null);
  const confettiContainerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const infoPanelRef = useRef<HTMLDivElement>(null);

  const synths = useRef<{ [key in SoundType]?: Tone.Synth | Tone.MembraneSynth }>({});
  const lastSoundTime = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const progress = await getUserProgress({});
        setCurrentUserLevel(progress.currentUserLevel);
        setRequirementsState(progress.requirementsState);
      } else {
        setCurrentUserLevel(1);
        setRequirementsState({});
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isGuest) {
      updateUserProgress({ currentUserLevel, requirementsState });
    }
  }, [currentUserLevel, requirementsState, isGuest]);

  const playSound = useCallback((type: SoundType, note?: string, duration?: string) => {
    if (typeof Tone === 'undefined' || !Tone.context) return;
    
    if (Tone.context.state !== 'running') {
      Tone.start();
    }
    const synth = synths.current[type];
    if (!synth) return;
    
    let now = Tone.now();
    if (now <= lastSoundTime.current) {
      now = lastSoundTime.current + 0.05; // Add a small delay
    }
    lastSoundTime.current = now;

    if (type === 'progress') {
        (synth as Tone.Synth).triggerAttackRelease('G4', '8n', now);
        (synth as Tone.Synth).triggerAttackRelease('C5', '8n', now + 0.2);
    } else if (type === 'hop') {
        (synth as Tone.MembraneSynth).triggerAttackRelease('C2', '8n', now);
    } else if (type === 'complete') {
        (synth as Tone.Synth).triggerAttackRelease('C5', '8n', now);
    } else if (note && duration) {
        (synth as Tone.Synth).triggerAttackRelease(note, duration, now);
    }
  }, []);
  
  const completeRequirement = useCallback((reqId: string) => {
    setRequirementsState(prev => {
      if (prev[reqId]) return prev;
      const newState = { ...prev, [reqId]: true };
      setJustCompletedActionId(reqId);
      playSound('complete');
      
      const action = pathNodesData.flatMap(n => n.actions).find(a => a.id === reqId);
      if (action?.next) {
        const nextNode = pathNodesData.find(n => n.id === `node-${action.next}`);
        if (nextNode) {
          animateUserIcon(nextNode);
        }
      }
      return newState;
    });
  }, [playSound]);

  useEffect(() => {
    synths.current.click = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
    synths.current.locked = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
    synths.current.progress = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.5 } }).toDestination();
    synths.current.hop = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 6, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).toDestination();
    synths.current.complete = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.5 } }).toDestination();
    synths.current.action = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
    
    return () => {
      Object.values(synths.current).forEach(synth => synth?.dispose());
    };
  }, []);

  const mapSvgPointToCss = useCallback((svgPoint: DOMPoint) => {
    if (!pathRef.current || !pathContainerRef.current) return { x: 0, y: 0 };
    const svg = pathRef.current.ownerSVGElement;
    if (!svg) return { x: 0, y: 0 };
  
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
  
    const containerRect = pathContainerRef.current.getBoundingClientRect();
  
    let screenPoint = new DOMPoint(svgPoint.x, svgPoint.y).matrixTransform(ctm);
  
    const cssX = screenPoint.x - containerRect.left;
    const cssY = screenPoint.y - containerRect.top;
  
    return { x: cssX, y: cssY };
  }, []);

  const placeElementsOnPath = useCallback(() => {
    const container = pathContainerRef.current;
    if (!pathRef.current || !container) return;
    
    setTimeout(() => {
      if (!pathRef.current) return;
      const totalLength = pathRef.current.getTotalLength();
      
      pathNodesData.forEach(nodeData => {
        const nodeEl = nodeRefs.current[nodeData.id];
        if (nodeEl) {
          const point = pathRef.current!.getPointAtLength(totalLength * nodeData.pathPos);
          const cssPoint = mapSvgPointToCss(point);
          nodeEl.style.left = `${cssPoint.x}px`;
          nodeEl.style.top = `${cssPoint.y}px`;
        }
      });
  
      const currentUserNode = pathNodesData.find(n => n.level === currentUserLevel);
      if (currentUserNode && userIconRef.current && !isAnimating) {
          const point = pathRef.current.getPointAtLength(totalLength * currentUserNode.pathPos);
          const cssPoint = mapSvgPointToCss(point);
          userIconRef.current.style.left = `${cssPoint.x}px`;
          userIconRef.current.style.top = `${cssPoint.y}px`;
      }
    }, 0);

  }, [mapSvgPointToCss, currentUserLevel, isAnimating]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
        placeElementsOnPath();
    });

    if (pathContainerRef.current) {
        observer.observe(pathContainerRef.current);
    }
    
    const rafId = requestAnimationFrame(() => {
        placeElementsOnPath();
        setIsMounted(true);
        setTimeout(() => {
            setShowSplash(false);
            setTimeout(() => {
              setShowCurtain(false);
              setTimeout(() => {
                setLogoZIndex(0);
              }, 1000);
            }, 1000);
        }, 1000);
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    }
  }, [placeElementsOnPath]);
  
  useEffect(() => {
      setSelectedNodeId(null);
  }, [currentUserLevel]);

  const triggerConfetti = useCallback((x: number, y: number) => {
    if (!confettiContainerRef.current) return;
    const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc'];
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${x}px`;
        confetti.style.top = `${y}px`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
        confettiContainerRef.current.appendChild(confetti);
        
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 50 + 50;
        const translateX = Math.cos(angle) * velocity;
        const translateY = Math.sin(angle) * velocity - 100;

        requestAnimationFrame(() => {
            confetti.style.opacity = '1';
            confetti.style.transform = `translate(${translateX}px, ${translateY + 150}px) rotate(360deg)`;
        });

        setTimeout(() => {
            confetti.style.opacity = '0';
            setTimeout(() => confetti.remove(), 1000);
        }, 800);
    }
  }, []);

  const animateUserIcon = useCallback((targetNode: PathNodeData) => {
    if (isAnimating || !pathRef.current || !userIconRef.current) return;
    setIsAnimating(true);
    setSelectedNodeId(null);

    const startNode = pathNodesData.find(n => n.level === currentUserLevel)!;
    const totalLength = pathRef.current.getTotalLength();
    const startLength = totalLength * startNode.pathPos;
    const endLength = totalLength * targetNode.pathPos;
    const duration = 2000;
    const hopCount = 15;
    let startTime: number | null = null;
    let lastHop = 0;

    const animationStep = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const currentLength = startLength + (endLength - startLength) * progress;
        const point = pathRef.current!.getPointAtLength(currentLength);
        const cssPoint = mapSvgPointToCss(point);

        userIconRef.current!.style.left = `${cssPoint.x}px`;
        userIconRef.current!.style.top = `${cssPoint.y}px`;
        
        const hopProgress = (progress * hopCount) % 1;
        const hopY = -Math.sin(hopProgress * Math.PI) * 20;
        userIconRef.current!.style.transform = `translate(-50%, calc(-50% + ${hopY}px))`;

        const currentHop = Math.floor(progress * hopCount);
        if (currentHop > lastHop) {
            playSound('hop');
            lastHop = currentHop;
        }
        
        if (progress < 1) {
            requestAnimationFrame(animationStep);
        } else {
             const finalPoint = mapSvgPointToCss(pathRef.current!.getPointAtLength(endLength));
             userIconRef.current!.style.left = `${finalPoint.x}px`;
             userIconRef.current!.style.top = `${finalPoint.y}px`;
             userIconRef.current!.style.transform = 'translate(-50%, -50%)'; 
            setIsAnimating(false);
            playSound('progress');
            setCurrentUserLevel(targetNode.level);
            triggerConfetti(finalPoint.x, finalPoint.y);

            if (targetNode.id === 'node-guest') {
                toast({
                    title: "Welcome, Guest!",
                    description: `You can now proceed on your journey.`,
                });
            } else if (targetNode.id === 'node-graduate') {
                toast({
                    title: "Congratulations, You Graduate!",
                });
            }
        }
    };
    requestAnimationFrame(animationStep);
  }, [isAnimating, currentUserLevel, mapSvgPointToCss, playSound, triggerConfetti, toast]);

  const handleActionClick = (action: PathAction) => {
    playSound('action', 'C4', '8n');

    if (action.action === 'open-pamphlet' || action.action === 'open-full-book') {
      const url = action.action === 'open-pamphlet' 
        ? 'https://docs.google.com/document/d/12YS_MYx6i_uaY62a8I3-SUgZwz11qqdQ4cmZxQ4X4ic/'
        : 'https://docs.google.com/document/d/e/2PACX-1vSynbRUG7OY7U2579zMdkkWWJz8_GNDUydqlIM_TBzOQwZUmf6FTIwPugj8AenLORbuKVSql4uAu1cq/pub?embedded=true';
      
      setLinkModalData({ title: action.label, url: url, requirementId: action.id });
      setModalState(s => ({ ...s, link: true }));
      return;
    }
     if (action.id === 'complete-tutorial') {
      setModalState(s => ({...s, tutorial: true}));
      return;
    }
    
    if (action.id === 'join-tribe') {
        setModalState(s => ({...s, joinTribe: true}));
        return;
    }
    if (action.id === 'start-tribe') {
        setModalState(s => ({...s, createTribe: true}));
        return;
    }
    
    if (action.next) { 
        if (action.id === 'sign-up' && !isGuest) {
            setModalState(s => ({...s, signup: true}));
            return;
        }

        const isCompleted = requirementsState[action.id];
        if (!isCompleted) {
            // This case handles advancing after completing a multi-step action like signup
            completeRequirement(action.id);
        } else {
             const nextNode = pathNodesData.find(n => n.id === `node-${action.next}`);
            if (nextNode && !isAnimating && nextNode.level > currentUserLevel) {
                animateUserIcon(nextNode);
            }
        }
    }
  };

  const handleNodeClick = (nodeData: PathNodeData) => {
    if (isAnimating) return;
    
    if (nodeData.id === selectedNodeId) {
        setSelectedNodeId(null);
        return;
    }

    if (nodeData.level > currentUserLevel) {
      playSound('locked', 'A2', '16n');
      const nodeEl = nodeRefs.current[nodeData.id];
      if (nodeEl) {
        nodeEl.classList.add('shake');
        setTimeout(() => nodeEl.classList.remove('shake'), 500);
      }
    } else {
      playSound('click', 'C4', '8n');
    }
    setSelectedNodeId(nodeData.id);
  };
  
  const selectedNode = pathNodesData.find(n => n.id === selectedNodeId);
  
  const placeInfoPanel = useCallback(() => {
    if (!infoPanelRef.current || !selectedNode) return;
    const nodeEl = nodeRefs.current[selectedNode.id];
    if (!nodeEl) return;
    
    const panelRect = infoPanelRef.current.getBoundingClientRect();
    const nodeRect = nodeEl.getBoundingClientRect();
    const containerRect = pathContainerRef.current!.getBoundingClientRect();
    
    let top = nodeRect.top - containerRect.top;
    let left;
    
    if (selectedNode.panelPos === 'right') {
        left = nodeRect.right - containerRect.left + 20;
    } else {
        left = nodeRect.left - containerRect.left - panelRect.width - 20;
    }

    top = top - (panelRect.height / 2) + (nodeRect.height / 2);
    
    top = Math.max(10, Math.min(top, containerRect.height - panelRect.height - 10));
    left = Math.max(10, Math.min(left, containerRect.width - panelRect.width - 10));

    infoPanelRef.current.style.top = `${top}px`;
    infoPanelRef.current.style.left = `${left}px`;

  }, [selectedNode]);

  useEffect(() => {
    if (selectedNodeId) {
        placeInfoPanel();
    }
  }, [selectedNodeId, placeInfoPanel, requirementsState]);

  const renderAbilities = (node: PathNodeData) => {
    return (
      <div className="space-y-2">
        {node.actions.map(action => {
          const isCompleted = requirementsState[action.id];
          const isNextStepAction = !!action.next;
          const isLocked = node.level > currentUserLevel || (action.dependsOn && !requirementsState[action.dependsOn]);
          const isActive = node.level === currentUserLevel;
          
          const Icon = actionIcons[action.id] || (action.next ? Users : undefined);

          const checkmarkAnimationClass = (isCompleted && action.id === justCompletedActionId) ? 'animate-pop' : '';
          const Checkmark = isCompleted ? (
            <span className={`checkmark-container ${checkmarkAnimationClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 inline-block mr-2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </span>
          ) : null;

          let buttonText = action.label;
          if (isNextStepAction) {
            const nextNodeTitle = pathNodesData.find(n => n.id === `node-${action.next}`)?.title;
            if (isCompleted) {
                buttonText = `Path to ${nextNodeTitle}`;
            }
          }
          
          return (
            <Button
              key={action.id}
              variant="secondary"
              size="sm"
              className={cn('w-full justify-start h-auto p-2 text-wrap', {
                'glow-green': isNextStepAction && isCompleted && isActive,
              })}
              onClick={(e) => {
                if (isLocked) {
                  const buttonEl = e.currentTarget;
                  buttonEl.classList.add('button-shake');
                  setTimeout(() => buttonEl.classList.remove('button-shake'), 600);
                  toast({
                    variant: "destructive",
                    title: "Prerequisite not met",
                    description: "You must complete the previous steps first.",
                  });
                } else {
                  handleActionClick(action);
                }
              }}
              disabled={isLocked && action.id !== 'sign-up'}
            >
              {isCompleted && !isNextStepAction ? Checkmark : null}
              {Icon && <Icon className="h-4 w-4 mr-2 shrink-0" />}
              <span className="flex-grow text-left">{buttonText}</span>
              {isNextStepAction && (isCompleted || isActive) ? '→' : ''}
            </Button>
          );
        })}
      </div>
    );
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
    });
  };

  const showLoginModal = () => setModalState({ ...modalState, login: true, signup: false });
  const showSignupModal = () => setModalState({ ...modalState, login: false, signup: true });

  const openModal = (modalName: keyof typeof modalState) => {
    setModalState(s => ({ ...s, [modalName]: true, menu: false }));
  };

  return (
    <TooltipProvider>
      <div id="path-container" className="path-container" ref={pathContainerRef}>
        <div className={cn("loading-curtain", !showCurtain && "hide")}></div>
        <div 
          id="logo-container" 
          className={cn('splash-logo-container', !showSplash && 'persistent-logo')}
          style={{ zIndex: logoZIndex }}
        >
          <video className="animated-logo" autoPlay loop muted playsInline style={{ backgroundColor: 'transparent' }}>
            <source src="/logo/spinning_logo.mp4" type="video/mp4" />
            <source src="/logo/spinning_logo.mp4" type="video/x-m4v" />
          </video>
        </div>

        <div className="menu-icon-container">
          <button className="action-icon" onClick={() => setModalState(s => ({...s, menu: true}))}>
            <Menu className="h-8 w-8 text-muted-foreground" />
          </button>
        </div>

        <div className="login-icon-container">
            {isGuest ? (
                <button className="action-icon" onClick={handleLogout}>
                    <LogOut className="h-8 w-8 text-muted-foreground" />
                </button>
            ) : (
                <button className="action-icon" onClick={() => setModalState(s => ({...s, login: true}))}>
                    <LogIn className="h-8 w-8 text-muted-foreground" />
                </button>
            )}
             <span className="node-label">{isGuest ? "Logout" : "Login"}</span>
        </div>
        
        <div id="confetti-container" ref={confettiContainerRef}></div>
        <svg id="path-svg" className="path-svg" viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="25%" stopColor="#EC4899" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="75%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <path
            ref={pathRef}
            d="M 696.5925826289068 102.44480533314044 A 400 400 0 1 1 503.4074173710931 102.44480533314046"
            fill="none"
            stroke="url(#path-gradient)"
            strokeLinecap="round"
          />
        </svg>
        
        {selectedNode && (
            <Card
                ref={infoPanelRef}
                className={cn('info-panel absolute z-30 w-80 shadow-2xl bg-card/95 backdrop-blur-sm', !isMounted && "hidden")}
            >
                <CardHeader className="relative">
                    <CardTitle>{selectedNode.title}</CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setSelectedNodeId(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    {selectedNode.description && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{selectedNode.description}</p>}
                    {selectedNode.req && (
                        <p className="text-sm text-muted-foreground mb-4">Requirement: {selectedNode.req}</p>
                    )}
                    <h4 className="font-semibold mb-2 text-foreground/80">To do:</h4>
                    {renderAbilities(selectedNode)}
                </CardContent>
            </Card>
        )}

        <div id="user-icon" ref={userIconRef}>
          <div id="you-are-here">
            {currentUserLevel === 1 ? 'Start Here' : 'You Are Here'}
          </div>
          <User className="w-5 h-5" />
        </div>

        {pathNodesData.map(node => {
          const Icon = nodeIcons[node.id.split('-')[1]] || Users;
          const isLocked = node.level > currentUserLevel;
          const isNextStep = node.level === currentUserLevel + 1;
          const isActive = node.level === currentUserLevel;
          const isSelected = selectedNodeId === node.id;

          return (
            <Tooltip key={node.id} delayDuration={100} open={isSelected ? false : undefined}>
              <TooltipTrigger asChild>
                <div
                  ref={(el) => {
                    nodeRefs.current[node.id] = el;
                  }}
                  className={cn('path-node', {
                    'active': isActive,
                    'locked': isLocked,
                    'next-step': isNextStep,
                  })}
                  onClick={() => handleNodeClick(node)}
                >
                  <Icon className={cn("h-8 w-8", (node.level > 4) ? "text-accent" : "text-muted-foreground")} />
                  <span className="node-label">{node.title}</span>
                </div>
              </TooltipTrigger>
               <TooltipContent side="top" className="bg-card text-card-foreground p-0 border-border w-80 shadow-2xl" sideOffset={15}>
                  <CardHeader className="relative">
                      <CardTitle>{node.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                      {node.description && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">{node.description}</p>}
                      {node.req && <p className="text-sm text-muted-foreground mb-4">Requirement: {node.req}</p>}
                      <h4 className="font-semibold mb-2 text-foreground/80">To do:</h4>
                      {renderAbilities(node)}
                  </CardContent>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <MenuSheet 
        isOpen={modalState.menu}
        onClose={() => setModalState(s => ({...s, menu: false}))}
        openModal={openModal}
        isGuest={isGuest}
      />
      <LinkModal
        isOpen={modalState.link}
        onClose={() => setModalState(s => ({ ...s, link: false }))}
        title={linkModalData.title}
        url={linkModalData.url}
        requirementId={linkModalData.requirementId}
        onComplete={completeRequirement}
      />
      <SignupModal 
        isOpen={modalState.signup}
        onClose={() => setModalState(s => ({ ...s, signup: false }))}
        onComplete={() => completeRequirement('sign-up')}
        showLogin={showLoginModal}
      />
      <LoginModal 
        isOpen={modalState.login}
        onClose={() => setModalState(s => ({ ...s, login: false }))}
        showSignup={showSignupModal}
      />
      <ChatbotModal
        isOpen={modalState.chatbot}
        onClose={() => setModalState(s => ({ ...s, chatbot: false }))}
      />
      <TutorialModal
        isOpen={modalState.tutorial}
        onClose={() => setModalState(s => ({ ...s, tutorial: false }))}
        onComplete={() => completeRequirement('complete-tutorial')}
      />
      <FeedbackModal
        isOpen={modalState.feedback}
        onClose={() => setModalState(s => ({ ...s, feedback: false }))}
      />
      <CreateTribeModal
        isOpen={modalState.createTribe}
        onClose={() => setModalState(s => ({ ...s, createTribe: false }))}
        onComplete={() => completeRequirement('start-tribe')}
      />
      <JoinTribeModal
        isOpen={modalState.joinTribe}
        onClose={() => setModalState(s => ({ ...s, joinTribe: false }))}
        onComplete={() => completeRequirement('join-tribe')}
      />
    </TooltipProvider>
  );
}
