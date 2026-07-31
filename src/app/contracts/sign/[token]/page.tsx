"use client";

import { useState, useRef, useEffect } from "react";

/*
 * E-Sign Page — /contracts/sign/[token]
 * Public page for contract signing with canvas signature
 */

export default function ContractSignPage() {
  const [contract, setContract] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Get token from URL
    const path = window.location.pathname;
    const token = path.split("/").pop();

    if (token) {
      fetch(`/api/contracts/sign/${token}`)
        .then(r => r.json())
        .then(d => {
          setContract(d.contract);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#061b31";
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatureData = canvas.toDataURL("image/png");
    const path = window.location.pathname;
    const token = path.split("/").pop();

    const res = await fetch(`/api/contracts/sign/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signerName,
        signatureData,
        signedAt: new Date().toISOString(),
      }),
    });

    if (res.ok) {
      setSigned(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]">
        <div className="w-8 h-8 border-2 border-[#533afd] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]">
        <div className="text-center">
          <div className="text-[48px] mb-4 opacity-20">📄</div>
          <div className="text-[18px] font-medium text-[#061b31]">Contract Not Found</div>
          <div className="text-[14px] text-[#64748d] mt-2">This contract link may have expired or is invalid.</div>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f9fc]">
        <div className="bg-white rounded-lg p-12 text-center max-w-md shadow-lg">
          <div className="text-[64px] mb-4">✅</div>
          <div className="text-[24px] font-semibold text-[#061b31]">Contract Signed!</div>
          <div className="text-[14px] text-[#64748d] mt-3">
            Thank you for signing the contract. A copy has been sent to your email.
          </div>
          <div className="mt-6 text-[12px] text-[#94a3b8]">
            Signed at {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc] py-12 px-4" style={{ fontFeatureSettings: "'ss01'" }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#533afd]/5 border border-[#533afd]/10 rounded-full px-4 py-1.5 mb-4">
            <span className="w-1.5 h-1.5 bg-[#15be53] rounded-full animate-pulse"></span>
            <span className="text-[11px] font-medium text-[#533afd]">Pending Signature</span>
          </div>
          <h1 className="text-[28px] font-light tracking-[-0.5px] text-[#061b31]">{contract.title || "Contract"}</h1>
          <p className="text-[14px] text-[#64748d] mt-2">{contract.contractType?.toUpperCase()} Agreement</p>
        </div>

        {/* Contract Details */}
        <div className="bg-white rounded-lg border border-[#e5edf5] p-8 mb-6">
          <h2 className="text-[16px] font-semibold mb-4">Contract Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Party</div>
              <div className="text-[14px] font-medium">{contract.partyName || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Type</div>
              <div className="text-[14px] font-medium">{contract.contractType?.toUpperCase()}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">Start Date</div>
              <div className="text-[14px] font-medium">{contract.startDate ? new Date(contract.startDate as string).toLocaleDateString() : "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider">End Date</div>
              <div className="text-[14px] font-medium">{contract.endDate ? new Date(contract.endDate as string).toLocaleDateString() : "—"}</div>
            </div>
          </div>

          {contract.terms && (
            <div className="mt-6">
              <div className="text-[11px] text-[#64748d] uppercase tracking-wider mb-2">Terms & Conditions</div>
              <div className="text-[13px] text-[#444] bg-[#f6f9fc] rounded p-4 whitespace-pre-wrap leading-[1.6]">
                {contract.terms as string}
              </div>
            </div>
          )}
        </div>

        {/* Signature */}
        <div className="bg-white rounded-lg border border-[#e5edf5] p-8">
          <h2 className="text-[16px] font-semibold mb-4">✍️ Your Signature</h2>

          <div className="mb-4">
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Your Full Name *</label>
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3.5 py-2.5 border border-[#e5edf5] rounded text-[13px] focus:border-[#533afd] outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-[12px] font-medium text-[#273951] mb-1.5">Draw Your Signature</label>
            <div className="border border-[#e5edf5] rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>
            <button onClick={clearSignature} className="text-[12px] text-[#533afd] mt-2 hover:underline">
              Clear signature
            </button>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#e5edf5]">
            <button
              onClick={submitSignature}
              disabled={!signerName}
              className="flex-1 bg-[#533afd] text-white py-3 rounded text-[14px] font-medium hover:bg-[#4434d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign Contract
            </button>
          </div>

          <p className="text-[11px] text-[#94a3b8] mt-4 text-center">
            By signing, you agree to the terms and conditions outlined above.
          </p>
        </div>
      </div>
    </div>
  );
}