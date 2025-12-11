import React from "react";
import QRCode from "qrcode";

type Props = {
  value: string;
  size?: number;
};

const LoyaltyQRCode: React.FC<Props> = ({ value, size = 160 }) => {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div className="text-[11px] text-gray-500 break-words">
        {value}
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="border rounded-lg bg-white p-2"
    />
  );
};

export default LoyaltyQRCode;
