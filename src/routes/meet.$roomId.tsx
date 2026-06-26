import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, Copy, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/meet/$roomId")({
  ssr: false,
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { as: "candidate" } });
    return { roomId: params.roomId };
  },
  component: MeetRoom,
});

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

function MeetRoom() {
  const { roomId } = Route.useParams();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [peerJoined, setPeerJoined] = useState(false);
  const [myUserId, setMyUserId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let cleanupFns: (() => void)[] = [];

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const myId = user.id;
      setMyUserId(myId);

      // 1) Get local media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e) {
        toast.error("Camera/mic access required to join.");
        return;
      }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // 2) Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.ontrack = (ev) => {
        if (remoteVideoRef.current && ev.streams[0]) {
          remoteVideoRef.current.srcObject = ev.streams[0];
          setPeerJoined(true);
        }
      };

      // 3) Supabase Realtime signaling channel
      const channel = supabase.channel(`meet:${roomId}`, { config: { broadcast: { self: false, ack: false } } });
      channelRef.current = channel;

      const send = (event: string, payload: unknown) =>
        channel.send({ type: "broadcast", event, payload: { from: myId, ...(payload as object) } });

      pc.onicecandidate = (ev) => {
        if (ev.candidate) send("ice", { candidate: ev.candidate });
      };

      // role: first-arriver waits (callee), second-arriver creates offer (caller)
      let isCaller = false;

      channel
        .on("broadcast", { event: "join" }, async ({ payload }) => {
          if (payload.from === myId) return;
          // Someone else just joined — I (already here) am the caller
          isCaller = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send("offer", { sdp: offer });
        })
        .on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.from === myId) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          send("answer", { sdp: answer });
        })
        .on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.from === myId) return;
          if (!pc.currentRemoteDescription) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        })
        .on("broadcast", { event: "ice" }, async ({ payload }) => {
          if (payload.from === myId) return;
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { /* ignore */ }
        })
        .on("broadcast", { event: "bye" }, () => {
          setPeerJoined(false);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Announce my arrival; the existing peer will respond with an offer
          send("join", {});
        }
      });

      cleanupFns.push(() => {
        send("bye", {});
        channel.unsubscribe();
      });
    })();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [roomId]);

  function toggleMic() {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((v) => !v);
  }
  function toggleCam() {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn((v) => !v);
  }
  async function shareScreen() {
    const pc = pcRef.current; if (!pc) return;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(screenTrack);
      setSharing(true);
      screenTrack.onended = async () => {
        const camTrack = localStreamRef.current?.getVideoTracks()[0];
        if (sender && camTrack) await sender.replaceTrack(camTrack);
        setSharing(false);
      };
    } catch (e) {
      toast.error("Screen share cancelled.");
    }
  }
  function hangup() {
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current?.unsubscribe();
    window.location.href = "/portal";
  }
  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Meeting link copied");
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm">
          <div className="size-7 rounded bg-accent text-accent-foreground grid place-items-center font-bold text-xs">T</div>
          <span className="font-semibold">TalentFlow Meet</span>
        </Link>
        <div className="text-xs opacity-60 flex items-center gap-3">
          <span className="flex items-center gap-1"><Users className="size-3" /> {peerJoined ? "2" : "1"} in room</span>
          <span>Room: {roomId.slice(0, 8)}…</span>
          <button onClick={copyLink} className="hover:opacity-100 opacity-70 flex items-center gap-1"><Copy className="size-3" /> Copy link</button>
        </div>
      </header>

      <main className="flex-1 grid md:grid-cols-2 gap-2 p-2 bg-black">
        <Tile label="You" muted videoRef={localVideoRef} active={camOn} />
        <Tile label={peerJoined ? "Participant" : "Waiting for participant…"} videoRef={remoteVideoRef} active={peerJoined} placeholder={!peerJoined} />
      </main>

      <footer className="px-6 py-4 border-t border-white/10 flex items-center justify-center gap-3 bg-zinc-950">
        <ControlBtn active={micOn} onClick={toggleMic} on={<Mic className="size-5" />} off={<MicOff className="size-5" />} />
        <ControlBtn active={camOn} onClick={toggleCam} on={<Video className="size-5" />} off={<VideoOff className="size-5" />} />
        <ControlBtn active={!sharing} onClick={shareScreen} on={<MonitorUp className="size-5" />} off={<MonitorUp className="size-5" />} label={sharing ? "Sharing" : "Share"} />
        <Button onClick={hangup} variant="destructive" size="lg" className="rounded-full size-12 p-0"><PhoneOff className="size-5" /></Button>
      </footer>
    </div>
  );
}

function Tile({ label, videoRef, active, muted, placeholder }: {
  label: string; videoRef: React.RefObject<HTMLVideoElement>; active: boolean; muted?: boolean; placeholder?: boolean;
}) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-zinc-900 border border-white/5 min-h-[40vh]">
      <video ref={videoRef} autoPlay playsInline muted={muted} className={`absolute inset-0 w-full h-full object-cover ${active ? "" : "opacity-0"}`} />
      {!active && (
        <div className="absolute inset-0 grid place-items-center text-white/40 text-sm">
          {placeholder ? label : "Camera off"}
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-xs">{label}</div>
    </div>
  );
}

function ControlBtn({ active, onClick, on, off, label }: { active: boolean; onClick: () => void; on: React.ReactNode; off: React.ReactNode; label?: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full size-12 grid place-items-center transition ${active ? "bg-white/10 hover:bg-white/20" : "bg-rose-600 hover:bg-rose-500"}`}
      title={label}
    >
      {active ? on : off}
    </button>
  );
}
