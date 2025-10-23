import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import { kpiData, salesChartData } from '../constants';
import type { KpiData, SalesData, InventoryItem } from '../types';
import { getAiInsights, generateTextToSpeech } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { decode, decodeAudioData } from '../utils/audio';

// Sub-component for KPI cards
const KpiCard: React.FC<{ item: KpiData }> = ({ item }) => (
  <Card className="p-5 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-gray-500">{item.title}</p>
      <p className="text-3xl font-semibold text-[#1C1C1C] mt-1">{item.value}</p>
      <div className={`mt-2 flex items-center text-xs font-medium ${item.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
        {item.change}
      </div>
    </div>
    <div className={`p-3 rounded-full ${item.changeType === 'increase' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
      <item.icon className="w-6 h-6" />
    </div>
  </Card>
);

// Sub-component for AI Insights
const AiInsights: React.FC = () => {
    const [insights, setInsights] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        const fetchInsights = async () => {
            setLoading(true);
            const result = await getAiInsights();
            setInsights(result);
            setLoading(false);
        };
        fetchInsights();
    }, []);
    
    const handleToggleSpeech = async () => {
        if (isSpeaking) {
            audioSourceRef.current?.stop();
            setIsSpeaking(false);
            return;
        }

        if (!insights.length || isGeneratingSpeech) return;
        
        setIsGeneratingSpeech(true);
        try {
            const fullText = "Here are your AI insights for today. " + insights.join(" ");
            const base64Audio = await generateTextToSpeech(fullText);
            
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const context = audioContextRef.current;
            const audioData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioData, context, 24000, 1);
            
            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.onended = () => {
                setIsSpeaking(false);
            };
            source.start();
            audioSourceRef.current = source;
            setIsSpeaking(true);

        } catch (error) {
            console.error("Failed to play audio insights:", error);
            // Optionally show an error to the user
        } finally {
            setIsGeneratingSpeech(false);
        }
    };


    return (
        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-full mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-600"><path d="M12 2.69l.346.666L19.5 15.3l-6.846 4.01L6.5 15.3l7.154-11.944z"/><path d="M12 22v-6"/><path d="M12 8V2"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m4.93 19.07 4.24-4.24"/></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-[#1C1C1C]">AI Insights</h3>
                 </div>
                 <button onClick={handleToggleSpeech} disabled={loading || isGeneratingSpeech} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={isSpeaking ? "Stop reading insights" : "Read insights aloud"}>
                    {isGeneratingSpeech ? (
                        <svg className="animate-spin h-5 w-5 text-[#11A66C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : isSpeaking ? (
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="6" y="6" width="12" height="12"></rect></svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    )}
                 </button>
            </div>
            {loading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded-md w-full"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded-md w-full"></div>
                </div>
            ) : (
                <ul className="space-y-3 text-sm text-gray-700">
                    {insights.map((insight, index) => (
                        <li key={index} className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2 mt-1 text-[#11A66C] flex-shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};

const InventorySnapshot: React.FC<{ inventory: InventoryItem[] }> = ({ inventory }) => {
    const getExpiryStatus = (expiryDate: string): { status: 'expired' | 'nearing' | 'safe', label: string, className: string } => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        if (expiry < now) return { status: 'expired', label: 'Expired', className: 'text-red-600 bg-red-100' };
        if (expiry <= thirtyDaysFromNow) return { status: 'nearing', label: 'Nears Expiry', className: 'text-yellow-600 bg-yellow-100' };
        
        const diffTime = Math.abs(expiry.getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return { status: 'safe', label: `Expires in ${diffDays} days`, className: 'text-gray-500' };
    };

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold text-[#1C1C1C]">Inventory Snapshot</h3>
             <p className="text-sm text-gray-500 mt-1">Key inventory items requiring attention.</p>
            <div className="mt-4 flow-root">
                <div className="-mx-6 -my-2 overflow-x-auto">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Item</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Expiry Status</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Edit</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {inventory.slice(0, 5).map(item => {
                                    const expiryInfo = getExpiryStatus(item.expiry);
                                    return (
                                        <tr key={item.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-0">
                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                <div className="text-gray-500">{item.brand} - Batch: {item.batch}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{item.stock} units</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${expiryInfo.className}`}>
                                                    {expiryInfo.label}
                                                </span>
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                                <a href="#" className="text-[#11A66C] hover:text-[#0F5132]">
                                                    Reorder<span className="sr-only">, {item.name}</span>
                                                </a>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Card>
    );
};


const Dashboard: React.FC<{ inventory: InventoryItem[] }> = ({ inventory }) => {
  return (
    <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto">
      <h1 className="text-2xl font-bold text-[#1C1C1C]">Welcome back, Ravi!</h1>
      <p className="text-gray-500 mt-1">Here's your pharmacy's performance snapshot for today.</p>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
        {kpiData.map(item => <KpiCard key={item.title} item={item} />)}
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Sales Chart */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="text-lg font-semibold text-[#1C1C1C]">Sales Today vs. Yesterday</h3>
          <div className="h-80 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(value) => `₹${Number(value)/1000}k`} />
                <Tooltip 
                  cursor={{fill: 'rgba(17, 166, 108, 0.1)'}}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem'
                  }}
                  formatter={(value) => [`₹${value}`, null]}
                 />
                <Legend iconType="circle" iconSize={8} />
                <Bar dataKey="Yesterday" fill="#a7f3d0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Today" fill="#11A66C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="space-y-6">
            <AiInsights />
        </div>
      </div>

      <div className="mt-6">
        <InventorySnapshot inventory={inventory} />
      </div>

    </main>
  );
};

export default Dashboard;
