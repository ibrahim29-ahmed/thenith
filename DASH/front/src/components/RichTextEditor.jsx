import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  Undo2,
  Redo2,
  RemoveFormatting,
  AlignRight,
  AlignLeft,
} from "lucide-react";

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "اكتب محتوى هذا القسم هنا...",
  minHeight = "180px",
  readOnly = false,
}) {
  const editorRef = useRef(null);
  const isUpdatingFromProp = useRef(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    h2: false,
    h3: false,
    p: false,
    ul: false,
    ol: false,
    blockquote: false,
    rtl: true,
  });
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedSelectionRange = useRef(null);

  // Sync prop value into contentEditable
  useEffect(() => {
    if (!editorRef.current) return;
    const currentHTML = editorRef.current.innerHTML;
    if (value !== currentHTML) {
      isUpdatingFromProp.current = true;
      editorRef.current.innerHTML = value || "";
      isUpdatingFromProp.current = false;
    }
  }, [value]);

  const updateActiveFormats = useCallback(() => {
    if (!document || !editorRef.current) return;
    try {
      const bold = document.queryCommandState("bold");
      const italic = document.queryCommandState("italic");
      const underline = document.queryCommandState("underline");
      const ul = document.queryCommandState("insertUnorderedList");
      const ol = document.queryCommandState("insertOrderedList");

      const block = (document.queryCommandValue("formatBlock") || "").toLowerCase();
      const h2 = block === "h2";
      const h3 = block === "h3";
      const p = block === "p" || (!h2 && !h3 && block !== "blockquote");
      const blockquote = block === "blockquote";
      const dir = editorRef.current.dir || "rtl";

      setActiveFormats({
        bold,
        italic,
        underline,
        h2,
        h3,
        p,
        ul,
        ol,
        blockquote,
        rtl: dir === "rtl",
      });
    } catch (e) {
      // Ignore queryCommand errors
    }
  }, []);

  const handleInput = () => {
    if (isUpdatingFromProp.current) return;
    if (editorRef.current && onChange) {
      const html = editorRef.current.innerHTML;
      onChange(html === "<p><br></p>" || html === "<br>" ? "" : html);
    }
    updateActiveFormats();
  };

  const exec = (command, val = null) => {
    if (readOnly || !editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, val);
    handleInput();
  };

  const handleFormatBlock = (tag) => {
    if (readOnly || !editorRef.current) return;
    editorRef.current.focus();
    const currentBlock = (document.queryCommandValue("formatBlock") || "").toLowerCase();
    if (currentBlock === tag.toLowerCase()) {
      document.execCommand("formatBlock", false, "<p>");
    } else {
      document.execCommand("formatBlock", false, `<${tag}>`);
    }
    handleInput();
  };

  const toggleDirection = (dir) => {
    if (!editorRef.current) return;
    editorRef.current.dir = dir;
    editorRef.current.focus();
    updateActiveFormats();
    handleInput();
  };

  const openLinkModal = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRange.current = sel.getRangeAt(0).cloneRange();
    }
    setLinkUrl("https://");
    setShowLinkModal(true);
  };

  const applyLink = () => {
    setShowLinkModal(false);
    if (!linkUrl || linkUrl.trim() === "" || linkUrl === "https://") return;

    if (savedSelectionRange.current && editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange.current);
    }

    let validUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(validUrl) && !/^mailto:/i.test(validUrl) && !validUrl.startsWith("/")) {
      validUrl = `https://${validUrl}`;
    }

    exec("createLink", validUrl);
    savedSelectionRange.current = null;
  };

  const removeLink = () => {
    exec("unlink");
  };

  return (
    <div className="w-full border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-600 text-xs">
          {/* Text Style */}
          <button
            type="button"
            onClick={() => exec("bold")}
            title="غامق (Ctrl+B)"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.bold ? "bg-indigo-100 text-indigo-700 font-bold" : ""
            }`}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("italic")}
            title="مائل (Ctrl+I)"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.italic ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("underline")}
            title="تسطير (Ctrl+U)"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.underline ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <Underline className="w-4 h-4" />
          </button>

          <span className="h-4 w-px bg-slate-300 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => handleFormatBlock("h2")}
            title="عنوان رئيسي (H2)"
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.h2 ? "bg-indigo-100 text-indigo-700 font-bold" : ""
            }`}
          >
            <Heading2 className="w-4 h-4" />
            <span className="text-[11px]">H2</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock("h3")}
            title="عنوان فرعي (H3)"
            className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1 hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.h3 ? "bg-indigo-100 text-indigo-700 font-bold" : ""
            }`}
          >
            <Heading3 className="w-4 h-4" />
            <span className="text-[11px]">H3</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock("p")}
            title="فقرة عادية"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.p ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <Pilcrow className="w-4 h-4" />
          </button>

          <span className="h-4 w-px bg-slate-300 mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => exec("insertUnorderedList")}
            title="قائمة نقطية"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.ul ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("insertOrderedList")}
            title="قائمة رقمية"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.ol ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock("blockquote")}
            title="اقتباس / تنبيه"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.blockquote ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <Quote className="w-4 h-4" />
          </button>

          <span className="h-4 w-px bg-slate-300 mx-1" />

          {/* Links */}
          <button
            type="button"
            onClick={openLinkModal}
            title="إدراج رابط"
            className="p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={removeLink}
            title="إزالة الرابط"
            className="p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <Unlink className="w-4 h-4" />
          </button>

          <span className="h-4 w-px bg-slate-300 mx-1" />

          {/* Direction */}
          <button
            type="button"
            onClick={() => toggleDirection("rtl")}
            title="اتجاه من اليمين لليسار (RTL)"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              activeFormats.rtl ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => toggleDirection("ltr")}
            title="اتجاه من اليسار لليمين (LTR)"
            className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900 ${
              !activeFormats.rtl ? "bg-indigo-100 text-indigo-700" : ""
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>

          <span className="h-4 w-px bg-slate-300 mx-1" />

          {/* Clear & Undo/Redo */}
          <button
            type="button"
            onClick={() => exec("removeFormat")}
            title="مسح التنسيق"
            className="p-1.5 rounded-lg transition-colors hover:bg-amber-100 text-amber-700"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("undo")}
            title="تراجع (Ctrl+Z)"
            className="p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => exec("redo")}
            title="إعادة (Ctrl+Y)"
            className="p-1.5 rounded-lg transition-colors hover:bg-slate-200 hover:text-slate-900"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editable Content Area */}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        dir="rtl"
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="p-4 text-slate-800 text-sm leading-relaxed outline-none focus:outline-none overflow-y-auto selection:bg-indigo-100 font-sans prose max-w-none [&_h2]:text-lg [&_h2]:font-black [&_h2]:text-slate-900 [&_h2]:mt-3 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-800 [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:mb-2.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_ol]:mb-2.5 [&_blockquote]:border-s-4 [&_blockquote]:border-indigo-600 [&_blockquote]:bg-slate-50 [&_blockquote]:p-3 [&_blockquote]:rounded-r-lg [&_blockquote]:text-slate-700 [&_blockquote]:italic [&_a]:text-indigo-600 [&_a]:underline"
      />

      {/* Link Insertion Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="text-slate-800 font-bold text-sm">إدراج رابط إلكتروني</h4>
            <div>
              <label className="text-xs text-slate-500 block mb-1">الرابط المطلوب (URL):</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white font-mono"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm"
              >
                تطبيق الرابط
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
