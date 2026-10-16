export const fieldLimits = Object.freeze({ name: 40, candy: 60 });

export function normalizeAnswer(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateAnswers(rawName, rawCandy) {
  const values = {
    name: normalizeAnswer(rawName),
    candy: normalizeAnswer(rawCandy)
  };
  const errors = {};

  if (!values.name) errors.name = "Please share your name.";
  else if (values.name.length > fieldLimits.name) errors.name = `Keep your name under ${fieldLimits.name} characters.`;

  if (!values.candy) errors.candy = "Tell us which candy gets your vote.";
  else if (values.candy.length > fieldLimits.candy) errors.candy = `Keep your answer under ${fieldLimits.candy} characters.`;

  return { values, errors, isValid: Object.keys(errors).length === 0 };
}
