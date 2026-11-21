export function BrandLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      aria-label="JobConnect Logo"
      className={className}
      fill="none"
      viewBox="0 0 36 36"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="36" height="36" rx="10" fill="#00236f" />
      <path
        d="M11 14C11 12.3431 12.3431 11 14 11H22C23.6569 11 25 12.3431 25 14V22C25 23.6569 23.6569 25 22 25H14C12.3431 25 11 23.6569 11 22V14Z"
        fill="#1e3a8a"
      />
      <path
        d="M15 16.5C15 15.6716 15.6716 15 16.5 15H19.5C20.3284 15 21 15.6716 21 16.5V20.5C21 22.1569 19.6569 23.5 18 23.5C16.3431 23.5 15 22.1569 15 20.5V16.5Z"
        fill="#4edea3"
      />
      <circle cx="24.5" cy="11.5" r="3" fill="#6ffbbe" />
    </svg>
  );
}
