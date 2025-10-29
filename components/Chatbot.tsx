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
                        let inputChunk = '';
                        let outputChunk = '';

                        if (message.serverContent?.inputTranscription) {
                            inputChunk = message.serverContent.inputTranscription.text;
                            transcriptionRef.current.input += inputChunk;
                        }
                        if (message.serverContent?.outputTranscription) {
                            outputChunk = message.serverContent.outputTranscription.text;
                            transcriptionRef.current.output += outputChunk;
                        }
                        
                        if (inputChunk || outputChunk) {
                            setTranscription(prev => ({
                                input: prev.input + inputChunk,
                                output: prev.output + outputChunk,
                            }));
                        }

                        if (message.serverContent?.turnComplete) {
                            const finalInput = transcriptionRef.current.input.trim();
                            const finalOutput = transcriptionRef.current.output.trim();
                            
                            const newTurnMessages: ChatMessage[] = [];
                            if (finalInput) newTurnMessages.push({ role: 'user', parts: [{ text: finalInput }] });
                            if (finalOutput) newTurnMessages.push({ role: 'model', parts: [{ text: finalOutput }] });

                            if (newTurnMessages.length > 0) {
                                setMessages(prev => [...prev, ...newTurnMessages]);
                            }

                            transcriptionRef.current = {input: '', output: ''};
                            setTranscription({input: '', output: ''});
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outputContext = outputAudioContextRef.current!;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputContext, 24000, 1);
                            const source = outputContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputContext.destination);
                            source.addEventListener('ended', () => sourcesRef.current.delete(source));
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onerror: (e) => {
                        console.error('Live session error:', e);
                        setMessages(prev => [...prev, {role: 'model', parts: [{text: "Sorry, a voice connection error occurred. Please try again."}]}]);
                        stopListening();
                    },
                    onclose: () => console.log('Live session closed.'),
                },
            });

            setIsListening(true);
        } catch (error) {
            console.error("Failed to start listening:", error);
            setMessages(prev => [...prev, {role: 'model', parts: [{text: "Sorry, I couldn't access your microphone. Please check permissions and try again."}]}]);
        }
    }, [stopListening]);

    useEffect(() => {
        return () => {
            if (isListening) stopListening();
        };
    }, [isListening, stopListening]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-[#11A66C] text-white p-4 rounded-full shadow-lg hover:bg-[#35C48D] transition-transform duration-200 transform hover:scale-110 flex items-center justify-center"
                aria-label="Open MedTrade AI"
            >
                <AiIcon className="w-8 h-8"/>
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300">
            <header className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl">
                <div className="flex items-center">
                    <AiIcon className="w-6 h-6 text-[#11A66C] mr-2"/>
                    <h2 className="text-lg font-semibold text-gray-800">MedTrade AI</h2>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-200" aria-label="Close chat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </header>
            
            <main className="flex-1 p-4 overflow-y-auto bg-gray-100/50">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-sm rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-[#11A66C] text-white' : 'bg-white text-gray-800 border'}`}>
                                <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
                                {msg.parts[0].sources && (
                                    <div className="mt-2 border-t pt-2">
                                        <h4 className="text-xs font-bold mb-1">Sources:</h4>
                                        <ul className="space-y-1">
                                            {msg.parts[0].sources.map((source, i) => (
                                                <li key={i}>
                                                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                                                        {i+1}. {source.title}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {(transcription.input || transcription.output) && (
                        <div>
                           {transcription.input && <p className="text-sm text-gray-600 text-right italic">You: {transcription.input}</p>}
                           {transcription.output && <p className="text-sm text-gray-800 italic">AI: {transcription.output}</p>}
                        </div>
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="bg-white text-gray-800 border rounded-2xl px-4 py-2 text-sm">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-1.5"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75 mr-1.5"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                                </div>
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="p-4 border-t bg-white rounded-b-2xl">
                 <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={isListening ? "Listening..." : "Ask me anything..."}
                        className="flex-1 px-4 py-2 text-sm border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]"
                        disabled={isLoading || isListening}
                    />
                    <button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading || isListening} className="p-2 text-white bg-[#11A66C] rounded-full hover:bg-[#35C48D] disabled:bg-gray-300 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                    <button onClick={() => isListening ? stopListening() : startListening()} className={`p-2 rounded-full ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:bg-gray-200'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    </button>
                 </div>
            </footer>
        </div>
    );
};

export default Chatbot;