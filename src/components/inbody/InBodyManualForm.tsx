import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';
import type { InBodyRecordData, SegmentalMap } from '@/types/inbody';
import { classifyBmi, classifyBodyFat, classifyVisceralFat } from '@/services/inbodyAnalytics';
import { inbodyService } from '@/services/inbodyService';
import { DatePickerModal } from '../DatePickerModal';
import { CustomerSelectModal } from '../CustomerSelectModal';
import { InBodySegmentalInput } from './InBodySegmentalInput';
import { InBodyMetricsFormFields, InBodyMetricsFormValues } from './InBodyMetricsFormFields';
import { QuickAddCustomerModal } from './QuickAddCustomerModal';
import { AppAlertModal, useAppAlert } from '@/components/AppAlertModal';

interface InBodyManualFormProps {
  visible: boolean;
  editingRecord?: InBodyRecordData | null;
  defaultCustomerId?: string;
  customers: CustomerProfile[];
  onClose: () => void;
  onSaved: (savedRecord: InBodyRecordData) => void;
  onCustomerCreated?: (newCustomer: CustomerProfile) => void;
}

const numVal = (v: string): number | null => (v.trim() === '' ? null : Number(v));

export function InBodyManualForm({
  visible,
  editingRecord,
  defaultCustomerId,
  customers,
  onClose,
  onSaved,
  onCustomerCreated,
}: InBodyManualFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { alertConfig, showError, showWarning, showSuccess } = useAppAlert();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showSegmental, setShowSegmental] = useState(false);

  // Quick Add Customer state & local customer sync
  const [allCustomers, setAllCustomers] = useState<CustomerProfile[]>(customers);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickAddInitialName, setQuickAddInitialName] = useState('');

  useEffect(() => {
    setAllCustomers(customers);
  }, [customers]);

  const handleCustomerCreated = (newCustomer: CustomerProfile) => {
    setAllCustomers((prev) => [newCustomer, ...prev]);
    setCustomerId(newCustomer._id);
    onCustomerCreated?.(newCustomer);
  };

  // Form Fields
  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [measurementDate, setMeasurementDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('170');
  const [bmi, setBmi] = useState('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [bodyFatMass, setBodyFatMass] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [bmr, setBmr] = useState('');
  const [visceralFatLevel, setVisceralFatLevel] = useState('');
  const [inbodyScore, setInbodyScore] = useState('');
  const [bodyWater, setBodyWater] = useState('');
  const [boneMineral, setBoneMineral] = useState('');
  const [waistHipRatio, setWaistHipRatio] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');

  // Segmental
  const [segMuscle, setSegMuscle] = useState<Record<keyof SegmentalMap, string>>({
    rightArm: '',
    leftArm: '',
    trunk: '',
    rightLeg: '',
    leftLeg: '',
  });
  const [segFat, setSegFat] = useState<Record<keyof SegmentalMap, string>>({
    rightArm: '',
    leftArm: '',
    trunk: '',
    rightLeg: '',
    leftLeg: '',
  });

  const selectedCustomer = useMemo(() => {
    return allCustomers.find((c) => c._id === customerId);
  }, [allCustomers, customerId]);

  // Reset or populate fields
  useEffect(() => {
    if (visible) {
      if (editingRecord) {
        const cId =
          typeof editingRecord.customerId === 'object' && editingRecord.customerId !== null
            ? editingRecord.customerId._id
            : String(editingRecord.customerId || '');
        setCustomerId(cId);
        setMeasurementDate(
          editingRecord.measurementDate
            ? editingRecord.measurementDate.slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        );
        setWeight(editingRecord.weight != null ? String(editingRecord.weight) : '');
        setHeight(editingRecord.height != null ? String(editingRecord.height) : '170');
        setBmi(editingRecord.bmi != null ? String(editingRecord.bmi) : '');
        setBodyFatPercentage(
          editingRecord.bodyFatPercentage != null ? String(editingRecord.bodyFatPercentage) : ''
        );
        setBodyFatMass(
          editingRecord.bodyFatMass != null ? String(editingRecord.bodyFatMass) : ''
        );
        setMuscleMass(
          editingRecord.muscleMass != null ? String(editingRecord.muscleMass) : ''
        );
        setBmr(editingRecord.bmr != null ? String(editingRecord.bmr) : '');
        setVisceralFatLevel(
          editingRecord.visceralFatLevel != null ? String(editingRecord.visceralFatLevel) : ''
        );
        setInbodyScore(
          editingRecord.inbodyScore != null ? String(editingRecord.inbodyScore) : ''
        );
        setBodyWater(
          editingRecord.bodyWater != null ? String(editingRecord.bodyWater) : ''
        );
        setBoneMineral(
          editingRecord.boneMineral != null ? String(editingRecord.boneMineral) : ''
        );
        setWaistHipRatio(
          editingRecord.waistHipRatio != null ? String(editingRecord.waistHipRatio) : ''
        );
        setConsultationNotes(editingRecord.consultationNotes || '');

        if (editingRecord.segmentalMuscle) {
          setSegMuscle({
            rightArm: editingRecord.segmentalMuscle.rightArm != null ? String(editingRecord.segmentalMuscle.rightArm) : '',
            leftArm: editingRecord.segmentalMuscle.leftArm != null ? String(editingRecord.segmentalMuscle.leftArm) : '',
            trunk: editingRecord.segmentalMuscle.trunk != null ? String(editingRecord.segmentalMuscle.trunk) : '',
            rightLeg: editingRecord.segmentalMuscle.rightLeg != null ? String(editingRecord.segmentalMuscle.rightLeg) : '',
            leftLeg: editingRecord.segmentalMuscle.leftLeg != null ? String(editingRecord.segmentalMuscle.leftLeg) : '',
          });
        }
        if (editingRecord.segmentalFat) {
          setSegFat({
            rightArm: editingRecord.segmentalFat.rightArm != null ? String(editingRecord.segmentalFat.rightArm) : '',
            leftArm: editingRecord.segmentalFat.leftArm != null ? String(editingRecord.segmentalFat.leftArm) : '',
            trunk: editingRecord.segmentalFat.trunk != null ? String(editingRecord.segmentalFat.trunk) : '',
            rightLeg: editingRecord.segmentalFat.rightLeg != null ? String(editingRecord.segmentalFat.rightLeg) : '',
            leftLeg: editingRecord.segmentalFat.leftLeg != null ? String(editingRecord.segmentalFat.leftLeg) : '',
          });
        }
      } else {
        setCustomerId(defaultCustomerId || '');
        setMeasurementDate(new Date().toISOString().slice(0, 10));
        setWeight('');
        setHeight('170');
        setBmi('');
        setBodyFatPercentage('');
        setBodyFatMass('');
        setMuscleMass('');
        setBmr('');
        setVisceralFatLevel('');
        setInbodyScore('');
        setBodyWater('');
        setBoneMineral('');
        setWaistHipRatio('');
        setConsultationNotes('');
        setSegMuscle({ rightArm: '', leftArm: '', trunk: '', rightLeg: '', leftLeg: '' });
        setSegFat({ rightArm: '', leftArm: '', trunk: '', rightLeg: '', leftLeg: '' });
      }
    }
  }, [visible, editingRecord, defaultCustomerId]);

  // Live Auto-calculate BMI
  const handleWeightChange = (v: string) => {
    setWeight(v);
    const w = Number(v);
    const h = Number(height);
    if (w > 0 && h > 0) {
      const calcBmi = (w / ((h / 100) * (h / 100))).toFixed(1);
      setBmi(calcBmi);
    }
  };

  const handleHeightChange = (v: string) => {
    setHeight(v);
    const h = Number(v);
    const w = Number(weight);
    if (w > 0 && h > 0) {
      const calcBmi = (w / ((h / 100) * (h / 100))).toFixed(1);
      setBmi(calcBmi);
    }
  };

  const handleFieldChange = (key: keyof InBodyMetricsFormValues, val: string) => {
    switch (key) {
      case 'weight':
        handleWeightChange(val);
        break;
      case 'height':
        handleHeightChange(val);
        break;
      case 'bmi':
        setBmi(val);
        break;
      case 'bodyFatPercentage':
        setBodyFatPercentage(val);
        break;
      case 'bodyFatMass':
        setBodyFatMass(val);
        break;
      case 'muscleMass':
        setMuscleMass(val);
        break;
      case 'bmr':
        setBmr(val);
        break;
      case 'visceralFatLevel':
        setVisceralFatLevel(val);
        break;
      case 'inbodyScore':
        setInbodyScore(val);
        break;
      case 'bodyWater':
        setBodyWater(val);
        break;
      case 'boneMineral':
        setBoneMineral(val);
        break;
      case 'waistHipRatio':
        setWaistHipRatio(val);
        break;
      case 'consultationNotes':
        setConsultationNotes(val);
        break;
    }
  };

  // Live Classification Badges
  const liveBmiClass = useMemo(() => classifyBmi(numVal(bmi)), [bmi]);
  const liveFatClass = useMemo(
    () => classifyBodyFat(numVal(bodyFatPercentage), selectedCustomer?.gender),
    [bodyFatPercentage, selectedCustomer?.gender]
  );
  const liveVisceralClass = useMemo(
    () => classifyVisceralFat(numVal(visceralFatLevel)),
    [visceralFatLevel]
  );

  const handleSubmit = async () => {
    if (!customerId) {
      showWarning('Vui lòng chọn học viên.', 'Thiếu thông tin');
      return;
    }
    const w = numVal(weight);
    if (!w || w <= 0) {
      showWarning('Vui lòng nhập cân nặng hợp lệ (> 0 kg).', 'Thiếu thông tin');
      return;
    }

    try {
      setSubmitting(true);

      const hasSegMuscle = Object.values(segMuscle).some((v) => v.trim() !== '');
      const hasSegFat = Object.values(segFat).some((v) => v.trim() !== '');

      const payload: Partial<InBodyRecordData> = {
        customerId,
        measurementDate,
        weight: w,
        height: numVal(height),
        bmi: numVal(bmi),
        bodyFatPercentage: numVal(bodyFatPercentage),
        bodyFatMass: numVal(bodyFatMass),
        muscleMass: numVal(muscleMass),
        bmr: numVal(bmr),
        visceralFatLevel: numVal(visceralFatLevel),
        inbodyScore: numVal(inbodyScore),
        bodyWater: numVal(bodyWater),
        boneMineral: numVal(boneMineral),
        waistHipRatio: numVal(waistHipRatio),
        consultationNotes: consultationNotes.trim() || undefined,
        source: 'MANUAL',
        segmentalMuscle: hasSegMuscle
          ? {
              rightArm: numVal(segMuscle.rightArm),
              leftArm: numVal(segMuscle.leftArm),
              trunk: numVal(segMuscle.trunk),
              rightLeg: numVal(segMuscle.rightLeg),
              leftLeg: numVal(segMuscle.leftLeg),
            }
          : null,
        segmentalFat: hasSegFat
          ? {
              rightArm: numVal(segFat.rightArm),
              leftArm: numVal(segFat.leftArm),
              trunk: numVal(segFat.trunk),
              rightLeg: numVal(segFat.rightLeg),
              leftLeg: numVal(segFat.leftLeg),
            }
          : null,
      };

      let saved: InBodyRecordData;
      if (editingRecord?._id) {
        saved = await inbodyService.updateRecord(editingRecord._id, payload);
      } else {
        saved = await inbodyService.createRecord(payload);
      }

      showSuccess(
        editingRecord?._id ? 'Đã cập nhật phiếu InBody!' : 'Đã lưu phiếu InBody thành công!',
        'Thành công',
        () => {
          onSaved(saved);
          onClose();
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu phiếu InBody.';
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons
                name={editingRecord ? 'create-outline' : 'add-circle-outline'}
                size={22}
                color={colors.primary}
              />
              <Text style={styles.title}>
                {editingRecord ? 'Chỉnh sửa Phiếu InBody' : 'Nhập Phiếu InBody Thủ Công'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Chọn Học Viên */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithActionRow}>
                <Text style={styles.label}>
                  Học viên <Text style={styles.req}>*</Text>
                </Text>
                <Pressable
                  style={styles.quickAddHeaderBtn}
                  onPress={() => {
                    setQuickAddInitialName('');
                    setShowQuickAddCustomer(true);
                  }}
                >
                  <Ionicons name="person-add" size={13} color={colors.primary} />
                  <Text style={styles.quickAddHeaderText}>+ Thêm nhanh</Text>
                </Pressable>
              </View>
              <Pressable
                style={styles.selectBtn}
                onPress={() => setShowCustomerPicker(true)}
              >
                <View style={styles.selectBtnContent}>
                  <Ionicons name="person-outline" size={16} color={colors.primary} />
                  <Text style={styles.selectBtnText} numberOfLines={1}>
                    {selectedCustomer
                      ? `${selectedCustomer.fullName} (${selectedCustomer.phone})`
                      : 'Chọn học viên...'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* 2. Ngày đo */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Ngày đo <Text style={styles.req}>*</Text>
              </Text>
              <Pressable
                style={styles.selectBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={styles.selectBtnContent}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={styles.selectBtnText}>{measurementDate}</Text>
                </View>
                <Ionicons name="calendar" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* 3. Reusable Metrics Input Group */}
            <InBodyMetricsFormFields
              values={{
                weight,
                height,
                bmi,
                bodyFatPercentage,
                bodyFatMass,
                muscleMass,
                bmr,
                visceralFatLevel,
                inbodyScore,
                bodyWater,
                boneMineral,
                waistHipRatio,
                consultationNotes,
              }}
              onChangeField={handleFieldChange}
              liveBmiClass={liveBmiClass}
              liveFatClass={liveFatClass}
              liveVisceralClass={liveVisceralClass}
              showBoneMineral={true}
            />

            {/* 4. Reusable Segmental Input (Accordion) */}
            <InBodySegmentalInput
              showSegmental={showSegmental}
              onToggle={() => setShowSegmental(!showSegmental)}
              segMuscle={segMuscle}
              setSegMuscle={setSegMuscle}
              segFat={segFat}
              setSegFat={setSegFat}
            />
          </ScrollView>

          {/* Footer Submit */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, submitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {editingRecord ? 'Lưu cập nhật' : 'Tạo phiếu InBody'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        title="Chọn ngày đo InBody"
        value={measurementDate}
        maxDate={new Date()}
        defaultToToday
        onClose={() => setShowDatePicker(false)}
        onSelect={(iso) => {
          setMeasurementDate(iso);
          setShowDatePicker(false);
        }}
      />

      {/* Customer Select Modal */}
      <CustomerSelectModal
        visible={showCustomerPicker}
        customers={allCustomers}
        selectedId={customerId}
        onClose={() => setShowCustomerPicker(false)}
        onSelect={(id) => {
          setCustomerId(id);
          setShowCustomerPicker(false);
        }}
        onPressAdd={(currentSearch) => {
          setShowCustomerPicker(false);
          setQuickAddInitialName(currentSearch);
          setShowQuickAddCustomer(true);
        }}
      />

      {/* Quick Add Customer Modal */}
      <QuickAddCustomerModal
        visible={showQuickAddCustomer}
        initialData={{
          fullName: quickAddInitialName || undefined,
          height: numVal(height) || undefined,
          initialWeight: numVal(weight) || undefined,
        }}
        onClose={() => setShowQuickAddCustomer(false)}
        onCreated={handleCustomerCreated}
      />

      <AppAlertModal {...alertConfig} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.primaryNavy,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 24,
  },
  formGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    fontWeight: '500',
    fontSize: 12.5,
    color: colors.text,
    marginBottom: 4,
  },
  labelWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  quickAddHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickAddHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  req: {
    color: colors.danger,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  selectBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectBtnText: {
    fontWeight: '400',
    fontSize: 13,
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 14,
    color: colors.textMuted,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
