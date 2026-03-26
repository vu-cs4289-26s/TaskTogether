'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Undo2,
    Redo2,
} from 'lucide-react';

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
            Placeholder.configure({
                placeholder: placeholder ?? 'Start typing...',
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3 text-text-primary',
            },
        },
    });

    // Sync content from parent when switching sections or resetting
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="border border-divider rounded-sm bg-surface overflow-hidden">
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
    if (!editor) return null;

    const btnClass = (active: boolean) =>
        [
            'p-1.5 rounded transition-colors',
            active
                ? 'bg-sage/15 text-sage'
                : 'text-text-secondary hover:bg-soft-highlight hover:text-text-primary',
        ].join(' ');

    return (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-divider bg-base/50">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold">
                <Bold size={16} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic">
                <Italic size={16} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={btnClass(editor.isActive('underline'))} title="Underline">
                <UnderlineIcon size={16} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Strikethrough">
                <Strikethrough size={16} />
            </button>

            <div className="w-px h-5 bg-divider mx-1" />

            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2">
                <Heading2 size={16} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="Heading 3">
                <Heading3 size={16} />
            </button>

            <div className="w-px h-5 bg-divider mx-1" />

            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List">
                <List size={16} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Ordered List">
                <ListOrdered size={16} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote">
                <Quote size={16} />
            </button>

            <div className="w-px h-5 bg-divider mx-1" />

            <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className={btnClass(false) + ' disabled:opacity-30'} title="Undo">
                <Undo2 size={16} />
            </button>
            <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className={btnClass(false) + ' disabled:opacity-30'} title="Redo">
                <Redo2 size={16} />
            </button>
        </div>
    );
}
