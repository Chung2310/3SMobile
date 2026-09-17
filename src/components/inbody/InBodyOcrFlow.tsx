import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';
import type { InBodyOcrDraft, InBodyRecordData } from '@/types/inbody';
import { inbodyService } from '@/services/inbodyService';
import { DatePickerModal } from '../DatePickerModal';
import { CustomerSelectModal } from '../CustomerSelectModal';
import { InBodyMetricsFormFields, InBodyMetricsFormValues } from './InBodyMetricsFormFields';
import { QuickAddCustomerModal } from './QuickAddCustomerModal';
import { AppAlertModal, useAppAlert } from '../AppAlertModal';

interface InBodyOcrFlowProps {
  visible: boolean;
  customers: CustomerProfile[];
  defaultCustomerId?: string;
  onClose: () => void;
  onConfirmed: (savedRecord: InBodyRecordData) => void;
  onCustomerCreated?: (newCustomer: CustomerProfile) => void;
}

interface OcrSelectedFile {
  id: string;
  uri: string;
  name: string;
  type: string;
  isPdf: boolean;
  size?: number;
}

const numVal = (v: string): number | null => (v.trim() === '' ? null : Number(v));

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const OCR_PIPELINE_STEPS = [
  { key: 'upload', label: 'Tải tệp' },
  { key: 'vision', label: 'AI quét ảnh' },
  { key: 'extract', label: 'Bóc tách số' },
] as const;

export function InBodyOcrFlow({
  visible,
  customers,
  defaultCustomerId,
  onClose,
  onConfirmed,
  onCustomerCreated,
}: InBodyOcrFlowProps) {
  const [step, setStep] = useState<'PICK_IMAGE' | 'REVIEW_DRAFT'>('PICK_IMAGE');
  const [loading, setLoading] = useState(false);
  const [scanSeconds, setScanSeconds] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<OcrSelectedFile[]>([]);
  const [showDocumentMenu, setShowDocumentMenu] = useState(false);
  const { alertConfig, showAlert, showSuccess, showError, showWarning, showConfirm } = useAppAlert();

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

  // Upload fields
  const [customerId, setCustomerId] = useState(defaultCustomerId || '');
  const [measurementDate, setMeasurementDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  // Review step fields
  const [draft, setDraft] = useState<InBodyOcrDraft | null>(null);
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
  const [waistHipRatio, setWaistHipRatio] = useState('');
  const [consultationNotes, setConsultationNotes] = useState('');

  const selectedCustomer = useMemo(() => {
    return allCustomers.find((c) => c._id === customerId);
  }, [allCustomers, customerId]);

  // Overall smooth progress calculation (0-100%)
  const overallProgress = useMemo(() => {
    if (!loading) return 0;
    if (uploadProgress < 100) {
      return Math.max(8, Math.min(25, Math.round(uploadProgress * 0.25)));
    }
    if (scanSeconds <= 1) return 30;
    if (scanSeconds <= 5) return 30 + (scanSeconds - 1) * 8;
    if (scanSeconds <= 11) return 62 + (scanSeconds - 5) * 4;
    return Math.min(95, 86 + (scanSeconds - 11) * 1.5);
  }, [loading, uploadProgress, scanSeconds]);

  // Current active stage details
  const currentStage = useMemo(() => {
    if (uploadProgress < 100) {
      return {
        index: 0,
        title: `Đang tải tệp lên (${uploadProgress}%)...`,
        desc: `Đang chuyển ${selectedFiles.length} tệp phiếu lên máy chủ an toàn`,
        subtext: 'Mô hình AI đang chờ tiếp nhận dữ liệu...',
      };
    }
    if (scanSeconds < 5) {
      return {
        index: 1,
        title: 'AI Vision đang quét phiếu InBody...',
        desc: 'Mô hình thị giác AI đang định vị bố cục & kiểm tra chất lượng',
        subtext: 'Hỗ trợ các mẫu InBody 270, 370S, 570, 770, Tanita...',
      };
    }
    if (scanSeconds < 11) {
      return {
        index: 2,
        title: 'Đang trích xuất & chuẩn hóa chỉ số...',
        desc: 'Bóc tách Cân nặng, SMM, BFP, InBody Score, BMR, Mỡ nội tạng...',
        subtext: 'Khớp nối tên học viên và ngày đo trên phiếu...',
      };
    }
    return {
      index: 2,
      title: 'Đang hoàn tất bản nháp đối soát...',
      desc: 'Sắp hoàn thành! Đang chuẩn bị bảng số liệu kiểm tra...',
      subtext: 'Bạn có thể kiểm tra và đối soát từng chỉ số trước khi lưu.',
    };
  }, [uploadProgress, scanSeconds, selectedFiles.length]);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
    };
  }, []);

  const handleReset = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    setStep('PICK_IMAGE');
    setLoading(false);
    setScanSeconds(0);
    setUploadProgress(0);
    setSelectedFiles([]);
    setShowDocumentMenu(false);
    setDraft(null);
    setCustomerId(defaultCustomerId || '');
    setMeasurementDate('');
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
    setWaistHipRatio('');
    setConsultationNotes('');
  };

  const handleClose = () => {
    if (loading) {
      showConfirm(
        'Đang quét phiếu',
        'Quá trình AI phân tích đang diễn ra. Bạn có chắc muốn hủy và đóng không?',
        () => {
          handleReset();
          onClose();
        },
        { confirmLabel: 'Dừng lại & Đóng', cancelLabel: 'Tiếp tục chờ', type: 'warning' }
      );
      return;
    }
    handleReset();
    onClose();
  };

  const addFiles = (newFiles: OcrSelectedFile[]) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > 5) {
        showWarning(
          'Chỉ hỗ trợ tối đa 5 ảnh hoặc tệp cho mỗi lần quét. Hệ thống đã giữ lại 5 tệp đầu tiên.',
          'Giới hạn tệp'
        );
        return combined.slice(0, 5);
      }
      return combined;
    });
  };

  // Launch Camera
  const handleTakePhoto = async () => {
    if (selectedFiles.length >= 5) {
      showWarning('Bạn đã chọn tối đa 5 tệp/ảnh.', 'Đã đạt giới hạn');
      return;
    }
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showWarning(
          'Ứng dụng cần quyền sử dụng máy ảnh để chụp phiếu InBody.',
          'Yêu cầu quyền Camera'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newFile: OcrSelectedFile = {
          id: `cam_${Date.now()}`,
          uri: asset.uri,
          name: asset.fileName || `inbody_photo_${selectedFiles.length + 1}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          isPdf: false,
          size: asset.fileSize,
        };
        addFiles([newFile]);
      }
    } catch {
      showError('Không thể mở máy ảnh.', 'Lỗi');
    }
  };

  // Launch Gallery (Multi-select)
  const handlePickLibrary = async () => {
    setShowDocumentMenu(false);
    if (selectedFiles.length >= 5) {
      showWarning('Bạn đã chọn tối đa 5 tệp/ảnh.', 'Đã đạt giới hạn');
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showWarning(
          'Ứng dụng cần quyền truy cập ảnh để chọn phiếu InBody.',
          'Yêu cầu quyền Thư viện'
        );
        return;
      }

      const remainingSlots = 5 - selectedFiles.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: OcrSelectedFile[] = result.assets.map((asset, idx) => ({
          id: `lib_${Date.now()}_${idx}`,
          uri: asset.uri,
          name: asset.fileName || `inbody_image_${selectedFiles.length + idx + 1}.jpg`,
          type: asset.mimeType || 'image/jpeg',
          isPdf: false,
          size: asset.fileSize,
        }));
        addFiles(newFiles);
      }
    } catch {
      showError('Không thể mở thư viện ảnh.', 'Lỗi');
    }
  };

  // Launch Document Picker (PDF & Files)
  const handlePickDocument = async () => {
    setShowDocumentMenu(false);
    if (selectedFiles.length >= 5) {
      showWarning('Bạn đã chọn tối đa 5 tệp/ảnh.', 'Đã đạt giới hạn');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: OcrSelectedFile[] = result.assets.map((doc, idx) => {
          const isPdf =
            doc.mimeType === 'application/pdf' ||
            doc.name.toLowerCase().endsWith('.pdf');
          return {
            id: `doc_${Date.now()}_${idx}`,
            uri: doc.uri,
            name: doc.name || `inbody_doc_${selectedFiles.length + idx + 1}`,
            type: doc.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
            isPdf,
            size: doc.size,
          };
        });
        addFiles(newFiles);
      }
    } catch {
      showError('Không thể mở trình chọn tài liệu.', 'Lỗi');
    }
  };

  // Execute OCR Scan
  const handleRunOcr = async () => {
    if (selectedFiles.length === 0) {
      showWarning('Vui lòng chụp ảnh hoặc chọn tài liệu phiếu InBody.', 'Chưa có tệp');
      return;
    }

    try {
      setLoading(true);
      setScanSeconds(0);
      setUploadProgress(0);

      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      scanTimerRef.current = setInterval(() => {
        setScanSeconds((prev) => prev + 1);
      }, 1000);

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('image', {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);
      });

      if (customerId) {
        formData.append('customerId', customerId);
      }
      if (measurementDate) {
        formData.append('measurementDate', measurementDate);
      }

      const ocrDraft = await inbodyService.scanOcr(formData, (percent) => {
        setUploadProgress(percent);
      });

      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }

      setDraft(ocrDraft);

      // Populate review fields
      if (ocrDraft.customerId) setCustomerId(ocrDraft.customerId);
      if (ocrDraft.measurementDate) {
        setMeasurementDate(ocrDraft.measurementDate.slice(0, 10));
      } else if (!measurementDate) {
        setMeasurementDate(new Date().toISOString().slice(0, 10));
      }
      setWeight(ocrDraft.weight != null ? String(ocrDraft.weight) : '');
      setHeight(ocrDraft.height != null ? String(ocrDraft.height) : '170');
      setBmi(ocrDraft.bmi != null ? String(ocrDraft.bmi) : '');
      setBodyFatPercentage(
        ocrDraft.bodyFatPercentage != null ? String(ocrDraft.bodyFatPercentage) : ''
      );
      setBodyFatMass(
        ocrDraft.bodyFatMass != null ? String(ocrDraft.bodyFatMass) : ''
      );
      setMuscleMass(
        ocrDraft.muscleMass != null ? String(ocrDraft.muscleMass) : ''
      );
      setBmr(ocrDraft.bmr != null ? String(ocrDraft.bmr) : '');
      setVisceralFatLevel(
        ocrDraft.visceralFatLevel != null ? String(ocrDraft.visceralFatLevel) : ''
      );
      setInbodyScore(
        ocrDraft.inbodyScore != null ? String(ocrDraft.inbodyScore) : ''
      );
      setBodyWater(
        ocrDraft.bodyWater != null ? String(ocrDraft.bodyWater) : ''
      );
      setWaistHipRatio(
        ocrDraft.waistHipRatio != null ? String(ocrDraft.waistHipRatio) : ''
      );

      setStep('REVIEW_DRAFT');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Quét OCR thất bại. Vui lòng thử lại với ảnh rõ hơn.';
      showError(msg, 'Lỗi nhận diện');
    } finally {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      setLoading(false);
    }
  };

  // Review field changes
  const handleFieldChange = (key: keyof InBodyMetricsFormValues, val: string) => {
    switch (key) {
      case 'weight':
        setWeight(val);
        break;
      case 'height':
        setHeight(val);
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
      case 'waistHipRatio':
        setWaistHipRatio(val);
        break;
      case 'consultationNotes':
        setConsultationNotes(val);
        break;
    }
  };

  // Confirm OCR Draft and save
  const handleConfirmDraft = async () => {
    if (!draft?._id) {
      showError('Không tìm thấy bản nháp OCR.', 'Lỗi');
      return;
    }

    if (!customerId) {
      showWarning('Vui lòng chọn học viên nhận phiếu InBody.', 'Thiếu thông tin');
      return;
    }

    if (!weight || Number.isNaN(Number(weight)) || Number(weight) <= 0) {
      showWarning('Cân nặng phải là số dương hợp lệ.', 'Sai cân nặng');
      return;
    }

    try {
      setLoading(true);

      const payload: Partial<InBodyRecordData> = {
        customerId,
        measurementDate: measurementDate || new Date().toISOString().slice(0, 10),
        weight: Number(weight),
        height: numVal(height),
        bmi: numVal(bmi),
        bodyFatPercentage: numVal(bodyFatPercentage),
        bodyFatMass: numVal(bodyFatMass),
        muscleMass: numVal(muscleMass),
        bmr: numVal(bmr),
        visceralFatLevel: numVal(visceralFatLevel),
        inbodyScore: numVal(inbodyScore),
        bodyWater: numVal(bodyWater),
        waistHipRatio: numVal(waistHipRatio),
        consultationNotes: consultationNotes.trim(),
      };

      const confirmed = await inbodyService.confirmOcr(draft._id, payload);
      showSuccess('Đã xác nhận và lưu phiếu InBody!', 'Thành công', () => {
        onConfirmed(confirmed);
        handleClose();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Xác nhận thất bại.';
      showError(msg, 'Lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="scan-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.title}>
                {step === 'PICK_IMAGE' ? 'Quét phiếu InBody AI' : 'Kiểm tra & Xác nhận'}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng"
              style={styles.closeBtn}
              onPress={handleClose}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Body Content */}
          {step === 'PICK_IMAGE' ? (
            /* STEP 1: Pick Images / Documents */
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.descText}>
                Hệ thống AI sẽ tự động đọc phiếu InBody (InBody 270, 370S, 570, 770, Tanita, Accuniq) và trích xuất chỉ số thể trạng.
              </Text>

              {/* Files Preview or Selection Cards */}
              {selectedFiles.length > 0 ? (
                <View style={styles.selectedFilesContainer}>
                  <View style={styles.selectedFilesHeader}>
                    <View style={styles.selectedCountBadge}>
                      <Ionicons name="documents" size={15} color={colors.primary} />
                      <Text style={styles.selectedCountText}>
                        Đã chọn {selectedFiles.length}/5 tệp
                      </Text>
                    </View>
                    <View style={styles.selectedHeaderActions}>
                      {selectedFiles.length < 5 && (
                        <Pressable
                          style={styles.addMoreBtn}
                          onPress={() => setShowDocumentMenu(true)}
                        >
                          <Ionicons name="add" size={15} color={colors.primary} />
                          <Text style={styles.addMoreText}>Thêm</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={styles.clearAllBtn}
                        onPress={() => setSelectedFiles([])}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        <Text style={styles.clearAllText}>Xóa hết</Text>
                      </Pressable>
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filesScrollList}
                  >
                    {selectedFiles.map((file, index) => (
                      <View key={file.id} style={styles.fileThumbnailCard}>
                        {file.isPdf ? (
                          <View style={styles.pdfThumbnailBox}>
                            <View style={styles.pdfIconCircle}>
                              <Ionicons name="document-text" size={24} color="#DC2626" />
                            </View>
                            <View style={styles.pdfBadgeBox}>
                              <Text style={styles.pdfBadgeText}>PDF</Text>
                            </View>
                            <Text style={styles.pdfName} numberOfLines={1}>
                              {file.name}
                            </Text>
                            {file.size ? (
                              <Text style={styles.pdfSize}>{formatFileSize(file.size)}</Text>
                            ) : null}
                          </View>
                        ) : (
                          <View style={styles.imageThumbnailBox}>
                            <Image
                              source={{ uri: file.uri }}
                              style={styles.imageThumb}
                              resizeMode="cover"
                            />
                            <View style={styles.imageBadge}>
                              <Text style={styles.imageBadgeText}>#{index + 1}</Text>
                            </View>
                          </View>
                        )}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Xóa tệp"
                          style={styles.removeFileBtn}
                          onPress={() =>
                            setSelectedFiles((prev) =>
                              prev.filter((item) => item.id !== file.id)
                            )
                          }
                        >
                          <Ionicons name="close" size={12} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                  <Text style={styles.filesHintText}>
                    Có thể tải 1 hoặc nhiều ảnh (mặt trước/mặt sau) hoặc file PDF phiếu InBody.
                  </Text>
                </View>
              ) : (
                <View style={styles.actionPickRow}>
                  <Pressable style={styles.pickCard} onPress={handleTakePhoto}>
                    <View style={[styles.pickIconBox, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name="camera" size={28} color="#0284C7" />
                    </View>
                    <Text style={styles.pickCardTitle}>Chụp ảnh phiếu</Text>
                    <Text style={styles.pickCardSub}>Dùng máy ảnh chụp trực tiếp</Text>
                  </Pressable>

                  <Pressable
                    style={styles.pickCard}
                    onPress={() => setShowDocumentMenu(true)}
                  >
                    <View style={[styles.pickIconBox, { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons name="document-text" size={28} color="#16A34A" />
                    </View>
                    <Text style={styles.pickCardTitle}>Tài liệu & Tệp</Text>
                    <Text style={styles.pickCardSub}>Nhiều ảnh hoặc file PDF</Text>
                  </Pressable>
                </View>
              )}

              {/* Customer & Measurement Date (Clean 1-row layout) */}
              <View style={styles.metaRow}>
                {/* Customer field */}
                <View style={[styles.formGroup, { flex: 1.2 }]}>
                  <Text style={styles.label}>Học viên</Text>
                  <Pressable
                    style={styles.selectBtn}
                    onPress={() => setShowCustomerPicker(true)}
                  >
                    <View style={styles.selectBtnContent}>
                      <Ionicons
                        name="person-outline"
                        size={15}
                        color={selectedCustomer ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.selectBtnText,
                          !selectedCustomer && styles.selectBtnPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {selectedCustomer
                          ? selectedCustomer.fullName
                          : 'AI tự nhận diện'}
                      </Text>
                    </View>
                    {selectedCustomer ? (
                      <Pressable hitSlop={8} onPress={() => setCustomerId('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </Pressable>
                    ) : (
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    )}
                  </Pressable>
                </View>

                {/* Measurement Date field */}
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Ngày đo</Text>
                  <Pressable
                    style={styles.selectBtn}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <View style={styles.selectBtnContent}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={measurementDate ? colors.primary : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.selectBtnText,
                          !measurementDate && styles.selectBtnPlaceholder,
                        ]}
                        numberOfLines={1}
                      >
                        {measurementDate ? measurementDate : 'Theo phiếu'}
                      </Text>
                    </View>
                    {measurementDate ? (
                      <Pressable hitSlop={8} onPress={() => setMeasurementDate('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </Pressable>
                    ) : (
                      <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* AI Processing Card (shown when loading) */}
              {loading && (
                <View style={styles.ocrLoadingCard}>
                  {/* Header: Tag + Live Timer */}
                  <View style={styles.ocrLoadingHeader}>
                    <View style={styles.ocrTagBadge}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.ocrTagBadgeText}>MÔ HÌNH AI ĐANG CHẠY</Text>
                    </View>
                    <View style={styles.ocrTimerPill}>
                      <Ionicons name="time-outline" size={13} color={colors.primary} />
                      <Text style={styles.ocrTimerPillText}>{scanSeconds}s</Text>
                    </View>
                  </View>

                  {/* Stage Headline & Subtitle */}
                  <Text style={styles.ocrLoadingTitle}>{currentStage.title}</Text>
                  <Text style={styles.ocrLoadingDesc}>{currentStage.desc}</Text>

                  {/* Progress Bar Track + Percent */}
                  <View style={styles.ocrProgressSection}>
                    <View style={styles.ocrProgressTrack}>
                      <View style={[styles.ocrProgressFill, { width: `${overallProgress}%` }]} />
                    </View>
                    <Text style={styles.ocrProgressPercentText}>{Math.round(overallProgress)}%</Text>
                  </View>

                  {/* 3-Step Pipeline Tracker */}
                  <View style={styles.ocrPipelineRow}>
                    {OCR_PIPELINE_STEPS.map((stepItem, idx) => {
                      const isDone = currentStage.index > idx;
                      const isCurrent = currentStage.index === idx;
                      return (
                        <React.Fragment key={stepItem.key}>
                          <View style={styles.ocrPipelineStep}>
                            <View
                              style={[
                                styles.ocrPipelineIcon,
                                isDone && styles.ocrPipelineIconDone,
                                isCurrent && styles.ocrPipelineIconActive,
                              ]}
                            >
                              {isDone ? (
                                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                              ) : isCurrent ? (
                                <ActivityIndicator
                                  size="small"
                                  color="#FFFFFF"
                                  style={{ transform: [{ scale: 0.7 }] }}
                                />
                              ) : (
                                <Text style={styles.ocrPipelineNumber}>{idx + 1}</Text>
                              )}
                            </View>
                            <Text
                              style={[
                                styles.ocrPipelineLabel,
                                (isDone || isCurrent) && styles.ocrPipelineLabelActive,
                              ]}
                              numberOfLines={1}
                            >
                              {stepItem.label}
                            </Text>
                          </View>
                          {idx < OCR_PIPELINE_STEPS.length - 1 && (
                            <View
                              style={[
                                styles.ocrPipelineLine,
                                currentStage.index > idx && styles.ocrPipelineLineDone,
                              ]}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </View>

                  {/* Reassurance Subtext */}
                  <View style={styles.ocrReassuranceBox}>
                    <Ionicons name="sparkles" size={13} color={colors.primary} />
                    <Text style={styles.ocrReassuranceText}>{currentStage.subtext}</Text>
                  </View>
                </View>
              )}

              {/* Scan Trigger Button */}
              <Pressable
                style={[
                  styles.primaryScanBtn,
                  (selectedFiles.length === 0 || loading) && styles.btnDisabled,
                  loading && styles.scanBtnRunning,
                ]}
                onPress={handleRunOcr}
                disabled={selectedFiles.length === 0 || loading}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.primaryScanBtnText}>
                      Đang phân tích AI ({scanSeconds}s)...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryScanBtnText}>
                      {selectedFiles.length > 0
                        ? `Quét ${selectedFiles.length} phiếu với AI`
                        : 'Quét phiếu InBody với AI'}
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          ) : (
            /* STEP 2: Review OCR Draft */
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Confidence banner */}
              <View style={styles.confidenceBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.confidenceTitle}>
                    Nhận diện thành công ({Math.round((draft?.confidence || 0.9) * 100)}% độ tin cậy)
                  </Text>
                  <Text style={styles.confidenceSub}>
                    Vui lòng kiểm tra lại các số liệu được trích xuất trước khi lưu.
                  </Text>
                </View>
              </View>

              {/* Customer Select */}
              <View style={styles.formGroup}>
                <View style={styles.labelWithActionRow}>
                  <Text style={styles.label}>
                    Học viên <Text style={styles.req}>*</Text>
                  </Text>
                  <Pressable
                    style={styles.quickAddHeaderBtn}
                    onPress={() => {
                      setQuickAddInitialName(draft?.detectedCustomerName || '');
                      setShowQuickAddCustomer(true);
                    }}
                  >
                    <Ionicons name="person-add" size={13} color={colors.primary} />
                    <Text style={styles.quickAddHeaderText}>+ Thêm nhanh học viên</Text>
                  </Pressable>
                </View>

                {draft?.detectedCustomerName && !selectedCustomer && (
                  <View style={styles.detectedNoticeRow}>
                    <View style={styles.detectedNoticeBadge}>
                      <Ionicons name="sparkles" size={13} color={colors.primary} />
                      <Text style={styles.detectedNoticeText}>
                        AI đọc được:{' '}
                        <Text style={{ fontWeight: '700' }}>
                          "{draft.detectedCustomerName}"
                        </Text>
                      </Text>
                    </View>
                    <Pressable
                      style={styles.detectedCreateBtn}
                      onPress={() => {
                        setQuickAddInitialName(draft.detectedCustomerName || '');
                        setShowQuickAddCustomer(true);
                      }}
                    >
                      <Text style={styles.detectedCreateBtnText}>Tạo hồ sơ ngay</Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  style={styles.selectBtn}
                  onPress={() => setShowCustomerPicker(true)}
                >
                  <View style={styles.selectBtnContent}>
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                    <Text
                      style={[
                        styles.selectBtnText,
                        !selectedCustomer && styles.selectBtnPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {selectedCustomer
                        ? `${selectedCustomer.fullName} (${selectedCustomer.phone})`
                        : 'Chọn học viên từ danh sách...'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              {/* Measurement Date */}
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

              {/* Reusable Form Fields */}
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
                  waistHipRatio,
                  consultationNotes,
                }}
                onChangeField={handleFieldChange}
                showBoneMineral={false}
              />

              {/* Confirm & Back Buttons */}
              <View style={styles.footerRow}>
                <Pressable
                  style={styles.backBtn}
                  onPress={() => setStep('PICK_IMAGE')}
                  disabled={loading}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
                  <Text style={styles.backBtnText}>Chọn lại</Text>
                </Pressable>

                <Pressable
                  style={[styles.confirmBtn, loading && styles.btnDisabled]}
                  onPress={handleConfirmDraft}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                      <Text style={styles.confirmBtnText}>Xác nhận & Lưu</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
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
          setQuickAddInitialName(currentSearch || draft?.detectedCustomerName || '');
          setShowQuickAddCustomer(true);
        }}
      />

      {/* Quick Add Customer Modal */}
      <QuickAddCustomerModal
        visible={showQuickAddCustomer}
        initialData={{
          fullName: quickAddInitialName || draft?.detectedCustomerName || undefined,
          height: numVal(height) || undefined,
          initialWeight: numVal(weight) || undefined,
        }}
        onClose={() => setShowQuickAddCustomer(false)}
        onCreated={handleCustomerCreated}
      />

      {/* Document Source Selection Bottom Modal */}
      <Modal
        visible={showDocumentMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDocumentMenu(false)}
      >
        <Pressable
          style={styles.sheetOverlay}
          onPress={() => setShowDocumentMenu(false)}
        >
          <Pressable
            style={styles.sheetContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderTitleRow}>
                <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
                <Text style={styles.sheetTitle}>Chọn tài liệu phiếu InBody</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                style={styles.sheetCloseBtn}
                onPress={() => setShowDocumentMenu(false)}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.sheetSub}>
              Hỗ trợ chọn nhiều ảnh hoặc file tài liệu PDF từ máy (tối đa 5 tệp):
            </Text>

            <View style={styles.sheetOptionsList}>
              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionItem,
                  pressed && styles.sheetOptionPressed,
                ]}
                onPress={handlePickLibrary}
              >
                <View style={[styles.sheetOptionIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="images" size={24} color="#16A34A" />
                </View>
                <View style={styles.sheetOptionInfo}>
                  <Text style={styles.sheetOptionTitle}>Thư viện ảnh</Text>
                  <Text style={styles.sheetOptionSub}>
                    Chọn 1 hoặc nhiều ảnh chụp phiếu từ bộ sưu tập
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionItem,
                  pressed && styles.sheetOptionPressed,
                ]}
                onPress={handlePickDocument}
              >
                <View style={[styles.sheetOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="document-text" size={24} color="#DC2626" />
                </View>
                <View style={styles.sheetOptionInfo}>
                  <Text style={styles.sheetOptionTitle}>Tệp tài liệu / File PDF</Text>
                  <Text style={styles.sheetOptionSub}>
                    Duyệt file PDF từ bộ nhớ máy, Drive hoặc Tệp
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 20,
  },
  descText: {
    fontWeight: '400',
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  actionPickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
  },
  pickCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickCardTitle: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.primaryNavy,
    marginBottom: 2,
  },
  pickCardSub: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
  },
  selectedFilesContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  selectedFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  selectedCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedCountText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  selectedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: '#E0F2FE',
  },
  addMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.danger,
  },
  filesScrollList: {
    gap: 10,
    paddingVertical: 6,
  },
  fileThumbnailCard: {
    position: 'relative',
    width: 100,
    height: 120,
    borderRadius: radius.md,
    overflow: 'visible',
  },
  imageThumbnailBox: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pdfThumbnailBox: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  pdfIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pdfBadgeBox: {
    backgroundColor: '#DC2626',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginBottom: 4,
  },
  pdfBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pdfName: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  pdfSize: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeFileBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    zIndex: 10,
  },
  filesHintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetSub: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  sheetOptionsList: {
    gap: 10,
  },
  sheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetOptionPressed: {
    backgroundColor: '#F1F5F9',
    transform: [{ scale: 0.99 }],
  },
  sheetOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionInfo: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  sheetOptionSub: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xs,
  },
  formGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    fontWeight: '500',
    fontSize: 12,
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
  detectedNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    gap: 8,
  },
  detectedNoticeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detectedNoticeText: {
    fontSize: 12,
    color: '#0369A1',
    flexShrink: 1,
  },
  detectedCreateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radius.sm,
  },
  detectedCreateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
    paddingVertical: 9,
  },
  selectBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  selectBtnText: {
    fontWeight: '500',
    fontSize: 12.5,
    color: colors.text,
  },
  selectBtnPlaceholder: {
    fontWeight: '400',
    color: colors.textMuted,
  },
  primaryScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryScanBtnText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confidenceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  confidenceTitle: {
    fontWeight: '700',
    fontSize: 13,
    color: '#15803D',
    marginBottom: 2,
  },
  confidenceSub: {
    fontWeight: '400',
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.sm,
  },
  backBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  backBtnText: {
    fontWeight: '600',
    fontSize: 13,
    color: colors.textMuted,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: '#16A34A',
  },
  confirmBtnText: {
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
  scanBtnRunning: {
    backgroundColor: '#1D4ED8',
    opacity: 0.95,
  },
  ocrLoadingCard: {
    backgroundColor: '#F0F7FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  ocrLoadingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ocrTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ocrTagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  ocrTimerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  ocrTimerPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  ocrLoadingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginBottom: 2,
  },
  ocrLoadingDesc: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  ocrProgressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ocrProgressTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#DBEAFE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  ocrProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  ocrProgressPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    minWidth: 32,
    textAlign: 'right',
  },
  ocrPipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  ocrPipelineStep: {
    alignItems: 'center',
    gap: 4,
  },
  ocrPipelineIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ocrPipelineIconDone: {
    backgroundColor: '#16A34A',
  },
  ocrPipelineIconActive: {
    backgroundColor: colors.primary,
  },
  ocrPipelineNumber: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  ocrPipelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
    marginBottom: 14,
  },
  ocrPipelineLineDone: {
    backgroundColor: '#16A34A',
  },
  ocrPipelineLabel: {
    fontSize: 10.5,
    color: colors.textMuted,
    fontWeight: '500',
  },
  ocrPipelineLabelActive: {
    color: colors.primaryNavy,
    fontWeight: '700',
  },
  ocrReassuranceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ocrReassuranceText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 15,
  },
});
