import React from "react";

/**
 * Safely parses and renders strings containing basic formatting tags
 * like <br />, <strong>...</strong>, <b>...</b>, <span>...</span>, <em>...</em>
 * into native React elements without using dangerouslySetInnerHTML.
 */
export const renderRichText = (content) => {
  if (!content || typeof content !== "string") return content;
  if (!/<[a-z][\s\S]*>/i.test(content)) return content;

  const tokens = content.split(
    /(<(?:strong|b|span|em)[^>]*>[\s\S]*?<\/(?:strong|b|span|em)>|<br\s*\/?>)/gi
  );

  return tokens.map((token, idx) => {
    if (!token) return null;

    if (/^<br\s*\/?>$/i.test(token.trim())) {
      return <br key={idx} />;
    }

    const match = token.match(
      /<(strong|b|span|em)(?:[^>]*class(?:Name)?=['"]([^'"]*)['"])?[^>]*>([\s\S]*?)<\/\1>/i
    );

    if (match) {
      const tagLower = match[1].toLowerCase();
      const rawClass = match[2] || "";
      const innerContent = match[3];

      let Tag = "span";
      let defaultClass = "";
      if (tagLower === "strong" || tagLower === "b") {
        Tag = "strong";
        defaultClass = "font-bold text-[#1d1d1f]";
      } else if (tagLower === "em") {
        Tag = "em";
        defaultClass = "italic";
      }

      const finalClass = rawClass
        ? rawClass.includes("font-")
          ? rawClass
          : `${rawClass} font-bold`
        : defaultClass;

      return (
        <Tag key={idx} className={finalClass}>
          {renderRichText(innerContent)}
        </Tag>
      );
    }

    return token;
  });
};

export default renderRichText;
