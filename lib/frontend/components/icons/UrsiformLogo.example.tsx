import React from "react";
import UrsiformLogo from "./UrsiformLogo";

// Example usage of the UrsiformLogo component
export const UrsiformLogoExamples = () => {
  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold">Ursiform Logo Examples</h2>

      {/* Different variants using predefined colors */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Predefined Variants</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center space-y-2">
            <UrsiformLogo width={100} height={100} />
            <span className="text-sm">Primary</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <UrsiformLogo width={100} height={100} />
            <span className="text-sm">Secondary</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <UrsiformLogo width={100} height={100} />
            <span className="text-sm">Success</span>
          </div>
          <div className="flex flex-col items-center space-y-2">
            <UrsiformLogo width={100} height={100} />
            <span className="text-sm">Destructive</span>
          </div>
        </div>
      </div>

      {/* Custom styling with CSS classes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Custom CSS Classes</h3>
        <div className="flex items-center space-x-4">
          <UrsiformLogo
            width={100}
            height={100}
            className="text-blue-500 hover:text-blue-700 transition-colors"
          />
          <UrsiformLogo
            width={100}
            height={100}
            className="text-green-500 opacity-50"
          />
        </div>
      </div>

      {/* Responsive sizing */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Responsive Sizing</h3>
        <UrsiformLogo className="w-20 h-20 md:w-32 md:h-32 lg:w-48 lg:h-48" />
      </div>
    </div>
  );
};

/* 
Alternative approaches:

1. Using CSS custom styles directly in className:
<UrsiformLogo 
  className="[&_path]:fill-blue-500 hover:[&_path]:fill-blue-700"
  width={100}
  height={100}
/>

2. Using CSS modules or styled-components:
<UrsiformLogo 
  className={styles.customLogo}  // where styles.customLogo targets the path elements
  width={100}
  height={100}
/>

3. Inline styles with CSS variables:
<UrsiformLogo 
  style={{ '--custom-fill': 'hsl(var(--warning))' } as React.CSSProperties}
  className="[&_path]:fill-[--custom-fill]"
  width={100}
  height={100}
/>
*/
