declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.css'; // Also allow importing regular CSS files if needed for other purposes 