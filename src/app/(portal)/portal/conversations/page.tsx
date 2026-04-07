"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Header } from "@/components/shared/Header";
import {
  Search, Loader2, MessageSquare, Phone, User, Bot, Clock,
  ChevronDown, X, ArrowDown
} from "lucide-react";
import { cn, formatRelativeTime, formatTime, getInitials, truncate } from "@/lib/utils";

interface Contact {
  phone: string;
  name: string;
  last_message: string;
  last_date: string;
  last_role: string;
  message_count: number;
  session_id: string;
}

interface Message {
  id: string;
  [key: string]: any;
}

interface ConvConfig {
  phoneField: string;
  nameField: string;
  messageField: string;
  roleField: string;
  dateField: string;
  sessionField: string;
}

export default function ConversationsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<ConvConfig | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load contacts
  useEffect(() => {
    loadContacts();
  }, []);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (selectedPhone) {
      pollIntervalRef.current = setInterval(() => {
        loadMessages(selectedPhone, true);
      }, 5000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedPhone]);

  const loadContacts = async (searchQuery?: string) => {
    setLoadingContacts(true);
    try {
      const params = new URLSearchParams({ action: "contacts" });
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/portal/conversations?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setContacts(data.contacts || []);
      if (data.config) setConfig(data.config);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingContacts(false);
    }
  };

  const loadMessages = async (phone: string, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/portal/conversations?action=messages&phone=${encodeURIComponent(phone)}&limit=200`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newMessages = data.messages || [];

      if (silent) {
        // Only update if there are new messages
        if (newMessages.length !== messages.length) {
          setMessages(newMessages);
          // Also refresh contacts to update last message
          loadContacts(search);
        }
      } else {
        setMessages(newMessages);
        setTimeout(scrollToBottom, 100);
      }

      if (data.config && !config) setConfig(data.config);
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  const selectContact = (phone: string) => {
    setSelectedPhone(phone);
    setMobileShowChat(true);
    loadMessages(phone);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 200);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    loadContacts(value);
  };

  const selectedContact = contacts.find(c => c.phone === selectedPhone);

  // Group messages by date
  const groupedMessages = messages.reduce((groups: { date: string; messages: Message[] }[], msg) => {
    if (!config) return groups;
    const dateStr = msg[config.dateField];
    if (!dateStr) return groups;

    const date = new Date(dateStr);
    const dateKey = date.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === dateKey) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ date: dateKey, messages: [msg] });
    }
    return groups;
  }, []);

  return (
    <>
      {/* Mobile: show header only when not in chat */}
      <div className={cn("lg:block", mobileShowChat && "hidden")}>
        <Header title="Conversaciones" subtitle={`${contacts.length} contactos`} />
      </div>

      <div className="flex h-[calc(100vh-65px)] lg:h-[calc(100vh-65px)] overflow-hidden">
        {/* ══ LEFT: Contact List ══ */}
        <div className={cn(
          "w-full lg:w-80 xl:w-96 flex-shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--card)]",
          mobileShowChat && "hidden lg:flex"
        )}>
          {/* Search */}
          <div className="p-3 border-b border-[var(--border)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                type="text"
                placeholder="Buscar contacto..."
                className="input-field pl-9 py-2 text-sm"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
                <p className="text-sm text-[var(--muted-foreground)]">
                  {search ? "Sin resultados" : "Sin conversaciones"}
                </p>
              </div>
            ) : (
              contacts.map(contact => {
                const isActive = contact.phone === selectedPhone;
                const isAgent = contact.last_role === "agente";

                return (
                  <button
                    key={contact.phone}
                    onClick={() => selectContact(contact.phone)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--border)]",
                      isActive
                        ? "bg-brand-purple/10 border-l-2 border-l-brand-purple"
                        : "hover:bg-[var(--muted)]/50"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold",
                        isActive ? "bg-brand-purple/20 text-brand-purple" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      )}>
                        {getInitials(contact.name)}
                      </div>
                      {/* Online indicator - show if last message < 30 min */}
                      {contact.last_date && (new Date().getTime() - new Date(contact.last_date).getTime()) < 1800000 && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-[var(--card)]" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={cn("text-sm font-semibold truncate", isActive && "text-brand-purple")}>
                          {contact.name || contact.phone}
                        </span>
                        <span className="text-[10px] text-[var(--muted-foreground)] flex-shrink-0 ml-2">
                          {contact.last_date ? formatRelativeTime(contact.last_date) : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isAgent && (
                          <Bot className="w-3 h-3 text-brand-cyan flex-shrink-0" />
                        )}
                        <span className="text-xs text-[var(--muted-foreground)] truncate">
                          {truncate(contact.last_message || "Sin mensajes", 45)}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {contact.message_count} mensajes
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ══ RIGHT: Chat Area ══ */}
        <div className={cn(
          "flex-1 flex flex-col bg-[var(--background)]",
          !mobileShowChat && !selectedPhone && "hidden lg:flex"
        )}>
          {!selectedPhone ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="w-20 h-20 rounded-full bg-brand-purple/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-brand-purple" />
              </div>
              <h3 className="text-lg font-semibold mb-2">SCILA AI Portal</h3>
              <p className="text-sm text-[var(--muted-foreground)] max-w-md">
                Selecciona una conversación del panel izquierdo para ver los mensajes entre el agente IA y el cliente.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
                {/* Back button for mobile */}
                <button
                  onClick={() => { setMobileShowChat(false); setSelectedPhone(null); }}
                  className="lg:hidden btn-ghost p-1.5"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                </button>

                <div className="w-10 h-10 rounded-full bg-brand-purple/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-purple">
                    {getInitials(selectedContact?.name || "")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {selectedContact?.name || selectedPhone}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-[var(--muted-foreground)]" />
                    <span className="text-xs text-[var(--muted-foreground)]">{selectedPhone}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">·</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {selectedContact?.message_count || 0} mensajes
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
                style={{
                  backgroundImage: "radial-gradient(circle at 50% 50%, var(--muted) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                  backgroundAttachment: "local",
                }}
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-purple" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-[var(--muted-foreground)]">Sin mensajes</p>
                  </div>
                ) : (
                  groupedMessages.map((group, gi) => (
                    <div key={gi}>
                      {/* Date separator */}
                      <div className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] shadow-sm">
                          {group.date}
                        </span>
                      </div>

                      {group.messages.map((msg, mi) => {
                        if (!config) return null;
                        const isAgent = msg[config.roleField] === "agente";
                        const text = msg[config.messageField] || "";
                        const time = msg[config.dateField] ? formatTime(msg[config.dateField]) : "";

                        return (
                          <div
                            key={msg.id || `${gi}-${mi}`}
                            className={cn("flex mb-1", isAgent ? "justify-start" : "justify-end")}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] lg:max-w-[60%] rounded-2xl px-3.5 py-2 shadow-sm",
                                isAgent
                                  ? "bg-[var(--card)] border border-[var(--border)] rounded-tl-md"
                                  : "bg-brand-purple text-white rounded-tr-md"
                              )}
                            >
                              {/* Role label */}
                              <div className={cn(
                                "flex items-center gap-1.5 mb-0.5",
                                isAgent ? "text-brand-cyan" : "text-white/70"
                              )}>
                                {isAgent ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                <span className="text-[10px] font-semibold">
                                  {isAgent ? "Agente IA" : "Cliente"}
                                </span>
                              </div>

                              {/* Message text */}
                              <p className={cn(
                                "text-sm leading-relaxed whitespace-pre-wrap break-words",
                                isAgent ? "text-[var(--foreground)]" : "text-white"
                              )}>
                                {text}
                              </p>

                              {/* Time */}
                              <div className={cn(
                                "flex justify-end mt-1",
                                isAgent ? "text-[var(--muted-foreground)]" : "text-white/60"
                              )}>
                                <span className="text-[10px]">{time}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to bottom button */}
              {showScrollBtn && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-20 right-6 w-10 h-10 rounded-full bg-brand-purple text-white shadow-lg flex items-center justify-center hover:bg-brand-purple-dark transition-colors z-10"
                >
                  <ArrowDown className="w-5 h-5" />
                </button>
              )}

              {/* Info bar */}
              <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--card)]">
                <p className="text-xs text-center text-[var(--muted-foreground)]">
                  Visualización de conversaciones del agente IA · Actualización cada 5 segundos
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
