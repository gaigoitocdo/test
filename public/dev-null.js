// Mock file to replace missing dependencies
console.log('📦 Using mock for missing dependencies');

// Mock solid-transition-group
export const Transition = ({ children }) => children;

// Mock solid-js
export const createSignal = () => [() => {}, () => {}];
export const createMemo = (fn) => fn;
export const onMount = () => {};
export const onCleanup = () => {};

// Default export
export default {};