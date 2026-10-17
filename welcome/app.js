import { validateAnswers } from "./form-utils.mjs";

const form = document.querySelector("#welcome-form");
const formView = document.querySelector("#form-view");
const successView = document.querySelector("#success-view");
const startOverButton = document.querySelector("#start-over");
const fields = {
  name: document.querySelector("#name"),
  candy: document.querySelector("#candy")
};
const errorElements = {
  name: document.querySelector("#name-error"),
  candy: document.querySelector("#candy-error")
};

function showErrors(errors) {
  for (const fieldName of Object.keys(fields)) {
    const message = errors[fieldName] ?? "";
    errorElements[fieldName].textContent = message;
    fields[fieldName].setAttribute("aria-invalid", String(Boolean(message)));
  }
}

function showWelcome({ name, candy }) {
  document.querySelector("#success-heading").textContent = `Welcome, ${name}.`;
  document.querySelector("#success-message").textContent = `${candy} is on the treat list. Your moonlit invitation is ready.`;
  formView.hidden = true;
  successView.hidden = false;
  successView.focus({ preventScroll: true });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateAnswers(fields.name.value, fields.candy.value);
  showErrors(result.errors);

  if (!result.isValid) {
    const firstInvalidField = Object.keys(fields).find((fieldName) => result.errors[fieldName]);
    fields[firstInvalidField].focus();
    return;
  }

  showWelcome(result.values);
});

for (const [fieldName, field] of Object.entries(fields)) {
  field.addEventListener("input", () => {
    if (!errorElements[fieldName].textContent) return;
    const result = validateAnswers(fields.name.value, fields.candy.value);
    showErrors(result.errors);
  });
}

startOverButton.addEventListener("click", () => {
  successView.hidden = true;
  formView.hidden = false;
  showErrors({});
  fields.name.focus();
});
