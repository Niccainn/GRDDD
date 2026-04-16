/**
 * Zoom read client. Uses the Zoom REST API v2 for user info,
 * meeting lists, and meeting recordings. OAuth2 bearer token auth.
 */

import { prisma } from '@/lib/db';
import { decryptString } from '@/lib/crypto/key-encryption';

type ZoomCreds = { accessToken: string };

const API_BASE = 'https://api.zoom.us/v2';

export async function getZoomClient(integrationId: string, environmentId: string) {
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, environmentId, provider: 'zoom', deletedAt: null, status: 'ACTIVE' },
  });
  if (!integration) throw new Error('Zoom integration not found or not active');

  const creds = JSON.parse(decryptString(integration.credentialsEnc)) as ZoomCreds;
  const headers = {
    Authorization: `Bearer ${creds.accessToken}`,
    Accept: 'application/json',
  };

  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { headers, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zoom ${path} failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }

  return {
    integration,

    /** Authenticated user info. */
    async getUser() {
      const data = await get<{
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        type: number;
        pmi: number;
        timezone: string;
        pic_url: string;
        account_id: string;
      }>('/users/me');
      return {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        type: data.type,
        personalMeetingId: data.pmi,
        timezone: data.timezone,
        pictureUrl: data.pic_url,
        accountId: data.account_id,
      };
    },

    /** List upcoming and recent meetings. */
    async listMeetings(limit = 30) {
      const data = await get<{
        total_records: number;
        meetings: {
          id: number;
          uuid: string;
          topic: string;
          type: number;
          start_time: string;
          duration: number;
          timezone: string;
          join_url: string;
          status: string;
        }[];
      }>(`/users/me/meetings?page_size=${limit}&type=scheduled`);
      return {
        totalRecords: data.total_records,
        meetings: data.meetings.map(m => ({
          id: m.id,
          uuid: m.uuid,
          topic: m.topic,
          type: m.type,
          startTime: m.start_time,
          duration: m.duration,
          timezone: m.timezone,
          joinUrl: m.join_url,
          status: m.status,
        })),
      };
    },

    /** Get cloud recordings for a specific meeting. */
    async getMeetingRecordings(meetingId: string) {
      const data = await get<{
        uuid: string;
        host_id: string;
        topic: string;
        start_time: string;
        duration: number;
        total_size: number;
        recording_count: number;
        recording_files: {
          id: string;
          recording_type: string;
          file_type: string;
          file_size: number;
          status: string;
          recording_start: string;
          recording_end: string;
          download_url: string;
          play_url: string;
        }[];
      }>(`/meetings/${meetingId}/recordings`);
      return {
        uuid: data.uuid,
        topic: data.topic,
        startTime: data.start_time,
        duration: data.duration,
        totalSize: data.total_size,
        recordingCount: data.recording_count,
        recordings: data.recording_files.map(r => ({
          id: r.id,
          recordingType: r.recording_type,
          fileType: r.file_type,
          fileSize: r.file_size,
          status: r.status,
          recordingStart: r.recording_start,
          recordingEnd: r.recording_end,
          downloadUrl: r.download_url,
          playUrl: r.play_url,
        })),
      };
    },
  };
}
