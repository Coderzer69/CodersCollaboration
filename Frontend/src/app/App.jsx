import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

function App() {
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });

  const [users, setUsers] = useState([]);

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;

    if (!providerRef.current || bindingRef.current) return;

    bindingRef.current = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      providerRef.current.awareness,
    );
  };

  const handleJoin = (e) => {
    e.preventDefault();

    const value = e.target.username.value.trim();

    if (!value) return;

    setUsername(value);
    window.history.pushState({}, "", `?username=${value}`);
  };

  useEffect(() => {
    if (!username) return;

    providerRef.current = new SocketIOProvider("/", "monaco", ydoc, {
      autoConnect: true,
    });

    const provider = providerRef.current;

    provider.awareness.setLocalStateField("user", {
      username,
    });

    const updateUsers = () => {
      const states = Array.from(provider.awareness.getStates().values());

      setUsers(
        states
          .filter((state) => state.user?.username)
          .map((state) => state.user),
      );
    };

    updateUsers();

    provider.awareness.on("change", updateUsers);

    if (editorRef.current && !bindingRef.current) {
      bindingRef.current = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness,
      );
    }

    const handleBeforeUnload = () => {
      provider.awareness.setLocalStateField("user", null);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      provider.awareness.off("change", updateUsers);

      window.removeEventListener("beforeunload", handleBeforeUnload);

      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }

      provider.disconnect();
      provider.destroy();

      providerRef.current = null;
    };
  }, [username, ydoc, yText]);

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input
            type="text"
            name="username"
            placeholder="Enter your username"
            className="p-2 rounded-lg bg-gray-800 text-white"
          />

          <button
            type="submit"
            className="p-2 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Join
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
      <aside className="h-full w-1/4 bg-amber-50 rounded-lg overflow-hidden">
        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">
          Users
        </h2>

        <ul className="p-4">
          {users.map((user) => (
            <li
              key={user.username}
              className="p-2 bg-gray-800 text-white rounded mb-2"
            >
              {user.username}
            </li>
          ))}
        </ul>
      </aside>

      <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// Start typing..."
          theme="vs-dark"
          onMount={handleMount}
        />
      </section>
    </main>
  );
}

export default App;
