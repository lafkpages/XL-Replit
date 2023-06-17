export function parseSid(sid: string) {
  if (sid[1] != ':') {
    return decodeURIComponent(sid);
  }
  return sid;
}
