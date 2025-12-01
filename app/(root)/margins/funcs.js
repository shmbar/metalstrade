
export const dataIds = (data) => {
    return data?.map(({ id }) => id) || []; // return an empty array if no items
}

export const countDecimalDigits = (inputString) => {

    const match = inputString.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;

    const decimalPart = match[1] || '';
    const exponentPart = match[2] || '';

    // Combine the decimal and exponent parts
    const combinedPart = decimalPart + exponentPart;

    // Remove leading zeros
    const trimmedPart = combinedPart.replace(/^0+/, '');

    return trimmedPart.length;
}

export const removeNonNumeric = (num) => num.toString().replace(/[^0-9.\-]/g, "");

