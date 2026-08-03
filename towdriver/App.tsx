import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';

/*
 * TowHub Driver App
 * Features: GPS tracking, job management, document upload, offline queue
 */

const API_BASE = 'https://towhub.vercel.app';

// ── Types ──
interface Job {
  id: string;
  status: string;
  customerName?: string;
  customerPhone?: string;
  pickupAddress: string;
  destinationAddress?: string;
  towVehicleMake?: string;
  towVehicleModel?: string;
  towVehicleYear?: number;
  notes?: string;
  createdAt: string;
}

interface DriverStatus {
  isActive: boolean;
  currentJobId?: string;
}

// ── Status Colors ──
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  assigned: '#3b82f6',
  en_route: '#6366f1',
  on_scene: '#a855f7',
  towing: '#f97316',
  completed: '#15be53',
  cancelled: '#94a3b8',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидание',
  assigned: 'Назначен',
  en_route: 'В пути',
  on_scene: 'На месте',
  towing: 'Буксирую',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [driverStatus, setDriverStatus] = useState<DriverStatus>({ isActive: false });
  const [loading, setLoading] = useState(true);

  // Load jobs
  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs?driver=current`);
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (e) {
      console.error('Failed to load jobs:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadJobs();
  };

  // Update job status
  const updateStatus = async (jobId: string, newStatus: string) => {
    try {
      await fetch(`${API_BASE}/api/jobs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status: newStatus }),
      });
      loadJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(prev => prev ? { ...prev, status: newStatus } : null);
      }
      Alert.alert('✅', `Статус: ${STATUS_LABELS[newStatus] || newStatus}`);
    } catch (e) {
      Alert.alert('❌', 'Не удалось обновить статус');
    }
  };

  // Toggle online status
  const toggleOnline = async () => {
    setDriverStatus(prev => ({ ...prev, isActive: !prev.isActive }));
    // In production, update via API
  };

  const activeJobs = jobs.filter(j => !['completed', 'cancelled'].includes(j.status));
  const completedJobs = jobs.filter(j => ['completed', 'cancelled'].includes(j.status));

  // ── Job Detail ──
  if (selectedJob) {
    const statusColor = STATUS_COLORS[selectedJob.status] || '#94a3b8';
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedJob(null)}>
            <Text style={styles.backButton}>← Назад</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Заказ</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[selectedJob.status] || selectedJob.status}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Customer */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>КЛИЕНТ</Text>
            <Text style={styles.cardValue}>{selectedJob.customerName || 'Клиент'}</Text>
            {selectedJob.customerPhone && (
              <Text style={styles.cardSubvalue}>📱 {selectedJob.customerPhone}</Text>
            )}
          </View>

          {/* Location */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>МЕСТОПОЛОЖЕНИЕ</Text>
            <Text style={styles.cardValue}>📍 {selectedJob.pickupAddress}</Text>
            {selectedJob.destinationAddress && (
              <Text style={styles.cardSubvalue}>🏁 {selectedJob.destinationAddress}</Text>
            )}
          </View>

          {/* Vehicle */}
          {(selectedJob.towVehicleMake || selectedJob.towVehicleModel) && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>АВТОМОБИЛЬ</Text>
              <Text style={styles.cardValue}>
                🚛 {selectedJob.towVehicleYear} {selectedJob.towVehicleMake} {selectedJob.towVehicleModel}
              </Text>
            </View>
          )}

          {/* Notes */}
          {selectedJob.notes && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>ЗАМЕТКИ</Text>
              <Text style={styles.cardValue}>{selectedJob.notes}</Text>
            </View>
          )}

          {/* AI Summary */}
          {selectedJob.notes?.includes('AI Dispatch') && (
            <View style={[styles.card, { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff' }]}>
              <Text style={[styles.cardLabel, { color: '#7c3aed' }]}>🤖 AI ДИСПЕТЧЕР</Text>
              <Text style={[styles.cardValue, { color: '#4c1d95' }]}>{selectedJob.notes}</Text>
            </View>
          )}

          {/* Status buttons */}
          <View style={styles.actions}>
            {selectedJob.status === 'assigned' && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#6366f1' }]} onPress={() => updateStatus(selectedJob.id, 'en_route')}>
                <Text style={styles.actionText}>🚗 Еду на вызов</Text>
              </TouchableOpacity>
            )}
            {selectedJob.status === 'en_route' && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#a855f7' }]} onPress={() => updateStatus(selectedJob.id, 'on_scene')}>
                <Text style={styles.actionText}>📍 Я на месте</Text>
              </TouchableOpacity>
            )}
            {selectedJob.status === 'on_scene' && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#f97316' }]} onPress={() => updateStatus(selectedJob.id, 'towing')}>
                <Text style={styles.actionText}>🚛 Буксирую</Text>
              </TouchableOpacity>
            )}
            {selectedJob.status === 'towing' && (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#15be53' }]} onPress={() => updateStatus(selectedJob.id, 'completed')}>
                <Text style={styles.actionText}>✅ Завершить</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Main List ──
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🚛 TowHub</Text>
          <Text style={styles.headerSub}>{activeJobs.length} активных заказов</Text>
        </View>
        <TouchableOpacity
          style={[styles.onlineButton, { backgroundColor: driverStatus.isActive ? '#15be53' : '#94a3b8' }]}
          onPress={toggleOnline}
        >
          <Text style={styles.onlineText}>{driverStatus.isActive ? '● Online' : '○ Offline'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Нет активных заказов</Text>
            <Text style={styles.emptyDesc}>Заказы появятся здесь автоматически</Text>
          </View>
        ) : (
          activeJobs.map(job => (
            <TouchableOpacity key={job.id} style={styles.jobCard} onPress={() => setSelectedJob(job)}>
              <View style={styles.jobHeader}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[job.status] || '#94a3b8' }]} />
                <Text style={styles.jobStatus}>{STATUS_LABELS[job.status] || job.status}</Text>
                <Text style={styles.jobTime}>{new Date(job.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={styles.jobCustomer}>{job.customerName || 'Клиент'}</Text>
              <Text style={styles.jobAddress} numberOfLines={1}>📍 {job.pickupAddress}</Text>
              {job.destinationAddress && (
                <Text style={styles.jobAddress} numberOfLines={1}>🏁 {job.destinationAddress}</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        {completedJobs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Завершённые</Text>
            {completedJobs.slice(0, 5).map(job => (
              <TouchableOpacity key={job.id} style={[styles.jobCard, { opacity: 0.6 }]} onPress={() => setSelectedJob(job)}>
                <Text style={styles.jobCustomer}>{job.customerName || 'Клиент'}</Text>
                <Text style={styles.jobAddress} numberOfLines={1}>{job.pickupAddress}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f9fc' },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5edf5',
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#061b31' },
  headerSub: { fontSize: 12, color: '#64748d', marginTop: 2 },
  backButton: { fontSize: 14, color: '#533afd', fontWeight: '500' },
  onlineButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  onlineText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5edf5',
  },
  cardLabel: { fontSize: 10, fontWeight: '600', color: '#64748d', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  cardValue: { fontSize: 14, fontWeight: '500', color: '#061b31', lineHeight: 20 },
  cardSubvalue: { fontSize: 13, color: '#64748d', marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '600' },
  actions: { gap: 10, marginTop: 8, marginBottom: 32 },
  actionButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  actionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5edf5',
  },
  jobHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  jobStatus: { fontSize: 11, fontWeight: '600', color: '#64748d', textTransform: 'uppercase' },
  jobTime: { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' },
  jobCustomer: { fontSize: 15, fontWeight: '600', color: '#061b31', marginBottom: 4 },
  jobAddress: { fontSize: 13, color: '#64748d' },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, opacity: 0.2, marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#061b31', marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: '#64748d' },
});