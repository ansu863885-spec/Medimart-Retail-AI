
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
