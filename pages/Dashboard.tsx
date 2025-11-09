import React, { useState, useEffect, useRef, useMemo } from 'react';
import Card from '../components/Card';
import { salesChartData } from '../constants';
import type { KpiData, SalesData, InventoryItem, RegisteredPharmacy, Transaction } from '../types';
import { getAiInsights, generateTextToSpeech } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Treemap, Cell } from 'recharts';
import { decode, decodeAudioData } from '../utils/audio';

// Sub-component for KPI cards
const KpiCard: React.FC<{ item: KpiData; onClick: (id: string) => void; }> = ({ item, onClick }) => (
  <Card onClick={() => onClick(item.id)} className="p-5 flex items-start justify-between h-full cursor-pointer">
    <div>
      <p className="text-sm font-medium text-app-text-secondary">{item.title}</p>
      <p className="text-3xl font-semibold text-app-text-primary mt-1">{item.value}</p>
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
const AiInsights: React.FC<{ inventory: InventoryItem[], transactions: Transaction[] }> = ({ inventory, transactions }) => {
    const [insights, setInsights] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        const fetchInsights = async () => {
             if (!inventory.length && !transactions.length) {
                setInsights([
                    "Welcome! Add your first product in the 'Inventory' page.",
                    "Use the 'Purchase Entry' page to record supplier bills and add stock.",
                    "Make your first sale from the 'POS' screen."
                ]);
                setLoading(false);
                return;
            }

            setLoading(true);

            // 1. Calculate summary data
            const today = new Date().toISOString().split('T')[0];
            const yesterdayMilli = new Date().setDate(new Date().getDate() - 1);
            const yesterday = new Date(yesterdayMilli).toISOString().split('T')[0];
            
            const todaySales = transactions
                .filter(t => t.date.startsWith(today))
                .reduce((sum, t) => sum + t.total, 0);

            const yesterdaySales = transactions
                .filter(t => t.date.startsWith(yesterday))
                .reduce((sum, t) => sum + t.total, 0);

            const lowStockItems = inventory.filter(item => item.stock > 0 && item.stock <= item.minStockLimit);
            
            const now = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(now.getDate() + 30);
            const nearExpiryItems = inventory.filter(item => {
                try {
                    const expiryDate = new Date(item.expiry);
                    return expiryDate > now && expiryDate <= thirtyDaysFromNow;
                } catch (e) {
                    return false;
                }
            });

            const categorySales: { [key: string]: number } = {};
            transactions.filter(t => t.date.startsWith(today)).forEach(t => {
                t.items.forEach(item => {
                    const category = item.category || 'Uncategorized';
                    const itemRevenue = item.mrp * item.quantity * (1 - (item.discountPercent || 0) / 100);
                    categorySales[category] = (categorySales[category] || 0) + itemRevenue;
                });
            });
            const topSellingCategory = Object.entries(categorySales).sort(([,a],[,b]) => b-a)[0]?.[0] || '';

            const productSales: { [key: string]: number } = {};
            transactions.filter(t => t.date.startsWith(today)).forEach(t => {
                t.items.forEach(item => {
                    const itemRevenue = item.mrp * item.quantity * (1 - (item.discountPercent || 0) / 100);
                    productSales[item.name] = (productSales[item.name] || 0) + itemRevenue;
                });
            });
            const fastMovingItemExamples = Object.entries(productSales).sort(([,a],[,b]) => b-a).slice(0, 3).map(([name]) => name);

            // 2. Create the summary object
            const summary = {
                todaySales,
                yesterdaySales,
                lowStockItemsCount: lowStockItems.length,
                lowStockItemExamples: lowStockItems.slice(0, 3).map(i => i.name),
                nearExpiryItemsCount: nearExpiryItems.length,
                nearExpiryItemExamples: nearExpiryItems.slice(0, 3).map(i => i.name),
                topSellingCategory,
                fastMovingItemExamples
            };
            
            const result = await getAiInsights(summary);
            setInsights(result);
            setLoading(false);
        };
        fetchInsights();
    }, [inventory, transactions]);
    
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
        <Card className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-full mr-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-600"><path d="M12 2.69l.346.666L19.5 15.3l-6.846 4.01L6.5 15.3l7.154-11.944z"/><path d="M12 22v-6"/><path d="M12 8V2"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m4.93 19.07 4.24-4.24"/></svg>
                    </div>
                    <h3 className="text-lg font-semibold text-app-text-primary">AI Insights</h3>
                 </div>
                 <button onClick={handleToggleSpeech} disabled={loading || isGeneratingSpeech} className="p-2 rounded-full text-app-text-secondary hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed" aria-label={isSpeaking ? "Stop reading insights" : "Read insights aloud"}>
                    {isGeneratingSpeech ? (
                        <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : isSpeaking ? (
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="6" y="6" width="12" height="12"></rect></svg>
                    ) : (
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    )}
                 </button>
            </div>
            {loading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-5/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-full"></div>
                </div>
            ) : (
                <ul className="space-y-3 text-sm text-app-text-secondary">
                    {insights.map((insight, index) => (
                        <li key={index} className="flex items-start">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2 mt-1 text-primary flex-shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <span>{insight}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};

const motivationalQuotes = [
    "The greatest wealth is health. - Virgil",
    "A healthy outside starts from the inside. - Robert Urich",
    "Your success is determined by your daily habits. Make today count!",
    "The secret to getting ahead is getting started. - Mark Twain",
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, rank, name } = props;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: COLORS[index % COLORS.length],
            stroke: '#fff',
            strokeWidth: 2 / (depth + 1e-10),
            strokeOpacity: 1 / (depth + 1e-10),
          }}
        />
        {depth === 1 && width > 50 && height > 25 ? (
          <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
            {name}
          </text>
        ) : null}
      </g>
    );
};


const Dashboard: React.FC<{ kpiData: KpiData[]; onKpiClick: (id: string) => void; currentUser: RegisteredPharmacy | null; transactions: Transaction[]; inventory: InventoryItem[] }> = ({ kpiData, onKpiClick, currentUser, transactions, inventory }) => {
  const dayOfYear = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = (now as any) - (start as any);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  }, []);
  
  const dailyQuote = motivationalQuotes[dayOfYear % motivationalQuotes.length];
  
  const salesVisualsData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterdayMilli = new Date().setDate(new Date().getDate() - 1);
    const yesterday = new Date(yesterdayMilli).toISOString().split('T')[0];
    
    const todayTransactions = transactions.filter(t => t.date.startsWith(today));
    const yesterdayTransactions = transactions.filter(t => t.date.startsWith(yesterday));

    const hourlySales: { name: string; Today: number; Yesterday: number }[] = Array.from({ length: 24 }, (_, i) => ({
      name: `${i}:00`,
      Today: 0,
      Yesterday: 0,
    }));
    
    todayTransactions.forEach(t => {
        const hour = new Date(t.date).getHours();
        hourlySales[hour].Today += t.total;
    });
    yesterdayTransactions.forEach(t => {
        const hour = new Date(t.date).getHours();
        hourlySales[hour].Yesterday += t.total;
    });

    const categorySales: { [key: string]: number } = {};
    todayTransactions.forEach(t => {
        t.items.forEach(item => {
            const category = item.category || 'Uncategorized';
            const itemRevenue = item.mrp * item.quantity * (1 - (item.discountPercent || 0) / 100);
            categorySales[category] = (categorySales[category] || 0) + itemRevenue;
        });
    });
    const categorySalesData = Object.entries(categorySales).map(([name, value]) => ({ name, value: Math.round(value) }));

    const productSales: { [key: string]: number } = {};
    todayTransactions.forEach(t => {
        t.items.forEach(item => {
             const itemRevenue = item.mrp * item.quantity * (1 - (item.discountPercent || 0) / 100);
             productSales[item.name] = (productSales[item.name] || 0) + itemRevenue;
        });
    });
    const productSalesData = Object.entries(productSales).map(([name, size]) => ({ name, size: Math.round(size) }));

    return { hourlySales, categorySalesData, productSalesData };
  }, [transactions]);

  const [primaryColor, setPrimaryColor] = useState('var(--color-primary)');
  const [textColor, setTextColor] = useState('var(--color-text-secondary)');

  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    // Function to read CSS variables
    const updateColors = () => {
        const pColor = rootStyle.getPropertyValue('--color-primary').trim();
        const tColor = rootStyle.getPropertyValue('--color-text-secondary').trim();
        if (pColor) setPrimaryColor(pColor);
        if (tColor) setTextColor(tColor);
    };

    updateColors(); // Initial set

    // Observe changes to theme/mode attributes on the root element
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    return () => observer.disconnect(); // Cleanup observer on component unmount
  }, []);
  
  return (
    <main className="p-6 page-fade-in">
      <h1 className="text-2xl font-bold text-app-text-primary">Welcome back, {currentUser?.pharmacyName || 'User'}!</h1>
      <p className="text-app-text-secondary mt-1">{dailyQuote}</p>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {kpiData.map((item, index) => (
            <div key={item.id} className="page-fade-in" style={{ animationDelay: `${index * 80}ms` }}>
                 <KpiCard item={item} onClick={onKpiClick} />
            </div>
        ))}
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-app-text-primary">Today vs. Yesterday Sales (Hourly)</h3>
          <div className="h-80 mt-4">
            {salesVisualsData.hourlySales.some(d => d.Today > 0 || d.Yesterday > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesVisualsData.hourlySales} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} />
                    <YAxis tick={{ fill: textColor, fontSize: 12 }} tickFormatter={(value) => `₹${Number(value)/1000}k`} />
                    <Tooltip 
                      cursor={{fill: 'rgba(17, 166, 108, 0.1)'}}
                      contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.75rem' }}
                      formatter={(value) => [`₹${value}`, null]}
                     />
                    <Legend iconType="circle" iconSize={8} />
                    <Bar dataKey="Yesterday" fill="#a7f3d0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Today" fill={primaryColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="flex items-center justify-center h-full text-app-text-secondary">
                    <p>No sales data for today or yesterday.</p>
                </div>
            )}
          </div>
        </Card>

        <div className="page-fade-in h-full" style={{ animationDelay: '200ms' }}>
            <AiInsights inventory={inventory} transactions={transactions} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
              <h3 className="text-lg font-semibold text-app-text-primary">Today's Sales by Category</h3>
              <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={salesVisualsData.categorySalesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fill={textColor}>
                            {salesVisualsData.categorySalesData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`}  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}/>
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </Card>
           <Card className="p-6">
              <h3 className="text-lg font-semibold text-app-text-primary">Today's Sales by Product</h3>
               <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <Treemap data={salesVisualsData.productSalesData} dataKey="size" ratio={4/3} stroke="var(--color-bg-card)" fill="#35C48D" content={<CustomizedContent colors={COLORS} />} >
                        <Tooltip formatter={(value: number, name: string) => [`₹${value.toFixed(2)}`, name]}  contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}/>
                      </Treemap>
                  </ResponsiveContainer>
              </div>
          </Card>
      </div>

    </main>
  );
};

export default Dashboard;