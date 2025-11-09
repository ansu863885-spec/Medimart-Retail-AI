function formatCsvField(field: any): string {
    const str = String(field ?? '');
    // If the string contains a comma, a quote, or a newline, enclose it in double quotes.
    if (/[",\n\r]/.test(str)) {
        // Escape existing double quotes by doubling them
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export function arrayToCsvRow(arr: any[]): string {
    return arr.map(formatCsvField).join(',');
}

export const downloadCsv = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    // Regex to handle quoted fields with commas and escaped quotes
    const regex = /("([^"]|"")*"|[^,]*)(,|$)/g;
    let match;
    
    regex.lastIndex = 0;

    do {
        match = regex.exec(line);
        if (match) {
            let value = match[1];
            // If the field was quoted, remove the outer quotes and unescape inner quotes
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            fields.push(value.trim());
        }
    } while (match && match[3] === ',');

    return fields;
}