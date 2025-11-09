export const renderBarcode = (element: HTMLElement, value: string) => {
    if (!element || !value) return;
    try {
        // @ts-ignore
        window.JsBarcode(element, value, {
            format: "CODE128",
            displayValue: true,
            fontSize: 14,
            margin: 10,
            height: 50,
        });
    } catch (e) {
        console.error("Failed to render barcode:", e);
    }
};
