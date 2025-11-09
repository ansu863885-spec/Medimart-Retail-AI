import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob, Content } from '@google/genai';
import type { ChatMessage, InventoryItem, Transaction, Purchase, Distributor, Customer } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';

const AiIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2.69l.346.666L19.5 15.3l-6.846 4.01L6.5 15.3l7.154-11.944z"/><path d="M12 22v-6"/><path d="M12 8V2"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m4.93 19.07 4.24-4.24"/></svg>
);

interface AppData {
    inventory: InventoryItem[];
    transactions: Transaction[];
    purchases: Purchase[];
    distributors: Distributor[];
    customers: Customer[];
}

interface ChatbotProps {
    appData: AppData;
}


const Chatbot: React.FC<ChatbotProps> = ({ appData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcription, setTranscription] = useState<{input: string, output: string}>({input: '', output: ''});

    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const transcriptionRef = useRef({input: '', output: ''});

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, transcription]);

    useEffect(() => {
        setMessages([
            {
                role: 'model',
                parts: [{ text: "Hello! I'm MedTrade AI. I can now answer questions about your sales, inventory, customers, and distributors. How can I help you today?" }]
            }
        ]);
    }, []);
    
    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;
        
        const text = inputValue;
        setInputValue('');
        const userMessage: ChatMessage = { role: 'user', parts: [{ text }] };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);

        const systemInstruction = `You are MedTrade AI, an expert assistant for the Medimart Pharmacy ERP system. You will be provided with the pharmacy's current data in JSON format. Your primary task is to answer user questions based ONLY on this provided data.

        - When asked about sales or revenue, refer to the 'transactions' array.
        - When asked about purchases, refer to the 'purchases' array.
        - When asked about inventory, stock levels, or medicine details (like composition, brand, etc.), refer to the 'inventory' array.
        - When asked about customer dues or receivables, find the relevant customer in the 'customers' array and check the 'balance' of the last entry in their 'ledger'. A positive balance means the customer owes money.
        - When asked about distributor dues or payables, find the relevant distributor in the 'distributors' array and check the 'balance' of the last entry in their 'ledger'. A positive balance means you owe the distributor money.
        - Perform calculations if necessary (e.g., total sales, summing up balances).
        - If the data required to answer a question is not available in the provided JSON, state that clearly. For example, if a medicine's composition is an empty string, say that the composition is not recorded.
        - Be helpful, concise, and accurate in your responses. Format financial data clearly. Do not answer questions unrelated to the pharmacy data.`;
        
        const dataContext = `This is the pharmacy's data in JSON format:\n${JSON.stringify(appData)}`;

        const primeUser: Content = { role: 'user', parts: [{ text: dataContext }] };
        const primeModel: Content = { role: 'model', parts: [{ text: 'Understood. I have analyzed the provided pharmacy data and am ready to answer your questions.' }] };
        
        const history: Content[] = updatedMessages.map(msg => ({
            role: msg.role,
            parts: msg.parts.map(p => ({ text: p.text })),
        }));
        
        // Keep the history to a reasonable size to avoid token limits
        const recentHistory = history.slice(-10); 
        
        const contents: Content[] = [primeUser, primeModel, ...recentHistory];

        try {
            const stream = await ai.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents,
                config: {
                    systemInstruction,
                },
            });

            let currentResponse: ChatMessage = { role: 'model', parts: [{ text: '' }] };
            setMessages(prev => [...prev, currentResponse]);

            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk.text;
                currentResponse = { ...currentResponse, parts: [{ text: fullText }] };
                
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = currentResponse;
                    return newMessages;
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
             setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Sorry, I encountered an error. Please try again." }] }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const stopListening = useCallback(() => {
        sessionPromiseRef.current?.then(session => session.close());
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        audioContextRef.current?.close();

        for (const source of sourcesRef.current.values()) {
            source.stop();
        }
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        sessionPromiseRef.current = null;
        setIsListening(false);
        setTranscription({input: '', output: ''});
        transcriptionRef.current = {input: '', output: ''};
    }, []);

    const startListening = useCallback(async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            if (!outputAudioContextRef.current) {
                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' }}},
                },
                callbacks: {
                    onopen: async () => {
                        console.log('Live session opened.');
                        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        audioContextRef.current = context;
                        const source = context.createMediaStreamSource(mediaStreamRef.current);
                        const scriptProcessor = context.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenaiBlob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(context.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const context = outputAudioContextRef.current;
                        if (!context) return;

                        if (message.serverContent?.outputTranscription) {
                            transcriptionRef.current.output += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.inputTranscription) {
                            transcriptionRef.current.input += message.serverContent.inputTranscription.text;
                        }

                        setTranscription({ ...transcriptionRef.current });

                        if (message.serverContent?.turnComplete) {
                            const fullInput = transcriptionRef.current.input;
                            const fullOutput = transcriptionRef.current.output;
                            
                            if (fullInput.trim()) {
                                setMessages(prev => [...prev, { role: 'user', parts: [{ text: fullInput }] }]);
                            }
                            if (fullOutput.trim()) {
                                setMessages(prev => [...prev, { role: 'model', parts: [{ text: fullOutput }] }]);
                            }
                            
                            transcriptionRef.current = { input: '', output: '' };
                            setTranscription({ input: '', output: '' });
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, context.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), context, 24000, 1);
                            const source = context.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(context.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                        
                        if (message.serverContent?.interrupted) {
                            for (const source of sourcesRef.current.values()) {
                                source.stop();
                            }
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (err: ErrorEvent) => {
                        console.error('Live session error:', err);
                        stopListening();
                    },
                    onclose: () => {
                        console.log('Live session closed.');
                        stopListening();
                    }
                }
            });
        } catch (error) {
            console.error('Failed to start listening:', error);
            setIsListening(false);
        }
    }, [stopListening]);
    
    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            setIsListening(true);
            startListening();
        }
    };

    return (
        <>
            <div className={`fixed bottom-6 right-6 z-40 transition-transform duration-300 ${isOpen ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'}`}>
                <button onClick={() => setIsOpen(true)} className="bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary-dark">
                    <AiIcon className="w-8 h-8"/>
                </button>
            </div>

            <div className={`fixed bottom-6 right-6 z-50 w-96 bg-card-bg rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16 pointer-events-none'}`} style={{ height: '70vh' }}>
                <div className="flex items-center justify-between p-4 border-b border-app-border">
                    <h3 className="font-semibold text-app-text-primary">MedTrade AI Assistant</h3>
                    <button onClick={() => setIsOpen(false)} className="text-app-text-secondary hover:text-app-text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-text' : 'bg-hover'}`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.parts[0].text}</p>
                            </div>
                        </div>
                    ))}
                    {(transcription.input || transcription.output) && (
                        <div className="flex justify-start">
                            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-hover/50 border border-dashed border-app-border">
                               {transcription.input && <p className="text-sm text-app-text-secondary">You: {transcription.input}</p>}
                               {transcription.output && <p className="text-sm text-app-text-primary">AI: {transcription.output}</p>}
                            </div>
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-hover">
                               <div className="flex items-center space-x-2">
                                   <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                   <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></div>
                                   <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></div>
                               </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-app-border">
                    <div className="flex items-center space-x-2">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder={isListening ? 'Listening...' : 'Ask me anything...'}
                            className="flex-1 px-4 py-2 border-app-border rounded-lg bg-input-bg"
                            disabled={isLoading || isListening}
                        />
                        <button onClick={handleMicClick} className={`p-2 rounded-full ${isListening ? 'bg-red-500 text-white' : 'text-app-text-secondary hover:bg-hover'}`} disabled={isLoading}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </button>
                        <button onClick={handleSendMessage} disabled={isLoading || isListening} className="px-4 py-2 font-semibold text-primary-text bg-primary rounded-lg hover:bg-primary-dark disabled:bg-gray-400">
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Chatbot;
