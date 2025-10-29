const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanThousand(n % 100) : '');
}

function capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function numberToWords(num: number): string {
    if (num === 0) return 'Zero Rupees only';

    const [integerPart, fractionalPart] = String(num.toFixed(2)).split('.').map(Number);
    
    let words = '';

    if (integerPart > 0) {
        const crores = Math.floor(integerPart / 10000000);
        const lakhs = Math.floor((integerPart % 10000000) / 100000);
        const thousands = Math.floor((integerPart % 100000) / 1000);
        const remainder = integerPart % 1000;

        if (crores > 0) words += convertLessThanThousand(crores) + ' Crore ';
        if (lakhs > 0) words += convertLessThanThousand(lakhs) + ' Lakh ';
        if (thousands > 0) words += convertLessThanThousand(thousands) + ' Thousand ';
        if (remainder > 0) words += convertLessThanThousand(remainder);
        
        words += ' Rupees';
    }

    if (fractionalPart > 0) {
        // Use convertLessThanThousand for paisa part as it can handle numbers up to 99 correctly.
        words += (integerPart > 0 ? ' and ' : '') + convertLessThanThousand(fractionalPart) + ' Paisa';
    }
    
    return capitalize(words.trim()) + ' only';
}
