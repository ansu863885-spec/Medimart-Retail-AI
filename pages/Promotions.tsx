import React, { useState } from 'react';
import Card from '../components/Card';
import { RegisteredPharmacy } from '../types';
import { generatePromotionalImage } from '../services/geminiService';

interface PromotionsProps {
    currentUser: RegisteredPharmacy | null;
}

const Promotions: React.FC<PromotionsProps> = ({ currentUser }) => {
    const [prompt, setPrompt] = useState('');
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError('Please enter a description for your promotion.');
            return;
        }
        if (!currentUser?.pharmacyLogoUrl) {
            setError('Please upload a pharmacy logo in Settings to use this feature.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedImageUrl(null);

        try {
            const imageBase64 = await generatePromotionalImage(prompt, currentUser.pharmacyLogoUrl);
            setGeneratedImageUrl(`data:image/png;base64,${imageBase64}`);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadImage = () => {
        if (!generatedImageUrl) return;
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        link.download = `promotion_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const examplePrompts = [
        "A 15% discount on all wellness products for Diwali.",
        "Monsoon sale: Buy one get one free on select cold & flu medicines.",
        "Holi festival offer on skincare products.",
        "Special offer for Mother's Day on health supplements.",
    ];

    return (
        <main className="flex-1 p-6 bg-[#F7FAF8] overflow-y-auto page-fade-in">
            <h1 className="text-2xl font-bold text-[#1C1C1C]">Promotional Image Generator</h1>
            <p className="text-gray-500 mt-1">Create stunning promotional images for Indian festivals and offers, featuring your pharmacy's logo.</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card className="p-6 space-y-4">
                    <div>
                        <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                            Describe your promotion
                        </label>
                        <textarea
                            id="prompt"
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#11A66C] focus:border-[#11A66C]"
                            placeholder="e.g., 'Create an image for a 20% discount on all vitamins for the New Year.'"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Or try an example:</p>
                        <div className="flex flex-wrap gap-2">
                            {examplePrompts.map((p, i) => (
                                <button key={i} onClick={() => setPrompt(p)} className="px-3 py-1 text-xs text-gray-600 bg-gray-100 border rounded-full hover:bg-gray-200">
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleGenerateImage}
                        disabled={isLoading || !currentUser?.pharmacyLogoUrl}
                        className="w-full px-4 py-3 text-base font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Generating...
                            </>
                        ) : 'Generate Image'}
                    </button>
                    {!currentUser?.pharmacyLogoUrl && (
                        <p className="text-xs text-center text-red-600">Please upload a pharmacy logo in the Settings page to enable image generation.</p>
                    )}
                </Card>
                <Card className="p-6 flex flex-col items-center justify-center">
                    <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed">
                        {isLoading && (
                            <div className="text-center text-gray-500">
                               <svg className="animate-spin mx-auto h-10 w-10 text-[#11A66C]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                               <p className="mt-2 font-medium">AI is creating your image...</p>
                            </div>
                        )}
                        {error && <p className="text-red-600 p-4">{error}</p>}
                        {generatedImageUrl && !isLoading && (
                            <img src={generatedImageUrl} alt="Generated Promotion" className="w-full h-full object-contain rounded-lg" />
                        )}
                        {!isLoading && !generatedImageUrl && !error && (
                            <div className="text-center text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                                <p className="mt-2 font-medium">Your generated image will appear here</p>
                            </div>
                        )}
                    </div>
                    {generatedImageUrl && !isLoading && (
                         <button
                            onClick={handleDownloadImage}
                            className="w-full mt-4 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 flex items-center justify-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download Image
                        </button>
                    )}
                </Card>
            </div>
        </main>
    );
};

export default Promotions;