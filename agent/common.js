async function func_Split_Quoted_String(str) {
  const result = [];
  let current = '';
  let insideQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (insideQuotes) {
      if (char === '\\' && (str[i + 1] === quoteChar || str[i + 1] === '\\')) {
        // Handle escaped quote or backslash
        current += str[i + 1];
        i++; // Skip the next character
      } else if (char === quoteChar) {
        // End of quoted string
        insideQuotes = false;
        result.push(current);
        current = '';
      } else {
        // Inside quoted string
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        // Start of quoted string
        insideQuotes = true;
        quoteChar = char;
      } else if (char === '\\' && str[i + 1] === ' ') {
        // Handle escaped space
        current += ' ';
        i++; // Skip the next character
      } else if (char === ' ') {
        // Space outside of quotes
        if (current.length > 0) {
          result.push(current);
          current = '';
        }
      } else {
        // Unquoted string
        current += char;
      }
    }
  }

  // Add the last argument if there's any
  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

async function numcheck(value, defaultNumber, min = 1, max = 900) {
  if (typeof value !== 'number' || isNaN(value)) {
    value = defaultNumber;
  }
  if (value < min) {
    return min;
  } else if (value > max) {
    return max;
  } else {
    return value;
  }
}

async function getrand(number, percent) {
  try {
    // Calculate the range based on the percentage
    number = Number(number);
    percent = Number(percent);
    const range = number * (percent / 100);

    // Calculate the minimum and maximum values
    let minValue = number - range;
    let maxValue = number + range;
    if (minValue < 1000) {
      minValue = 1000;
    }
    if (maxValue < 1000) {
      maxValue = 1000;
    }

    if (maxValue > 600000) {
      maxValue = 600000;
    }

    // Generate a random value between minValue and maxValue
    const randomValue = Math.random() * (maxValue - minValue) + minValue;

    return Math.floor(randomValue);
  } catch (error) {
    // Handle error if needed
  }
}

module.exports = {
  func_Split_Quoted_String,
  numcheck,
  getrand
};