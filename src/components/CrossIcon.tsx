interface CrossIconProps {
  className?: string;
}

export const CrossIcon = ({ className = "size-7" }: CrossIconProps) => {
  return (
    <svg
      className={className}
      width="100%"
      height="100%"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_286_37096)">
        <path
          d="M4.375 14H23.625"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
          strokeLinejoin="round"
        />
        <path
          d="M14 4.375V23.625"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="square"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_286_37096">
          <rect width="28" height="28" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}; 