export const changeTime = (time: string): string => {
  const date = new Date(time);
  const formatDate = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formattedDateTime = `${formatDate} : ${formattedTime}`;
  return formattedDateTime;
};
