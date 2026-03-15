import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import {
  addEmergencyContact,
  getEmergencyContacts,
  removeEmergencyContact,
  editEmergencyContact,
  getPanicMessage,
  setPanicMessage,
  EmergencyContact,
} from '@/services/emergencyContactService';
import { getAuthToken } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';
import AuthGateModal from '@/components/AuthGateModal';

export default function EmergencyContactsSection() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [panicMessage, setPanicMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPanicMessageModal, setShowPanicMessageModal] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<any[]>([]);
  const [showDeviceContacts, setShowDeviceContacts] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [editRelationship, setEditRelationship] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'edit' | 'panic' | null>(null);

  const editPhoneRef = useRef<TextInput>(null);
  const editNameRef = useRef<TextInput>(null);
  const editRelationshipRef = useRef<TextInput>(null);

  useEffect(() => {
    loadContacts();
    loadPanicMessage();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const result = await getEmergencyContacts();
      if (result.success && result.data) {
        setContacts(result.data);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const loadPanicMessage = async () => {
    try {
      const result = await getPanicMessage();
      if (result.success && typeof result.data === 'string') {
        setPanicMsg(result.data);
      } else if (result.success && result.data) {
        setPanicMsg('');
      }
    } catch (error) {
    }
  };

  const checkAuth = async (): Promise<boolean> => {
    const token = await getAuthToken();
    return !!(token && user);
  };

  const handleOpenAddModal = async () => {
    const isAuth = await checkAuth();
    if (!isAuth) {
      setPendingAction('add');
      setShowAuthGate(true);
      return;
    }
    setShowAddModal(true);
  };

  const handleOpenEditModal = async (contact: EmergencyContact) => {
    const isAuth = await checkAuth();
    if (!isAuth) {
      setPendingAction('edit');
      setShowAuthGate(true);
      return;
    }
    setEditingContact(contact);
    setEditPhone(contact.phone);
    setEditName(contact.name);
    setEditRelationship(contact.relationship);
    setShowEditModal(true);
  };

  const handleOpenPanicMessageModal = async () => {
    const isAuth = await checkAuth();
    if (!isAuth) {
      setPendingAction('panic');
      setShowAuthGate(true);
      return;
    }
    setShowPanicMessageModal(true);
  };

  const handleAuthGateClosed = () => {
    setShowAuthGate(false);
    setPendingAction(null);
  };

  const loadDeviceContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();

      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
        });

        // Filter contacts that have phone numbers
        const contactsWithPhones = data
          .filter((contact) => contact.phoneNumbers && contact.phoneNumbers.length > 0)
          .map((contact) => ({
            name: contact.name || 'Unnamed Contact',
            phone: contact.phoneNumbers?.[0]?.number || '',
          }));

        setDeviceContacts(contactsWithPhones);
        setShowDeviceContacts(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load device contacts');
    }
  };

  const handleSelectDeviceContact = (contact: any) => {
    setNewName(contact.name);
    setNewPhone(contact.phone);
    setShowDeviceContacts(false);
    // User will fill in relationship manually
  };

  const handleAddContact = async () => {
    if (!newPhone.trim() || !newName.trim() || !newRelationship.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsAdding(true);
    try {
      const result = await addEmergencyContact(newPhone, newName, newRelationship);
      if (result.success) {
        Alert.alert('Success', 'Emergency contact added');
        setNewPhone('');
        setNewName('');
        setNewRelationship('');
        setShowAddModal(false);
        await loadContacts();
      } else {
        Alert.alert('Error', result.error || 'Failed to add contact');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while adding contact');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveContact = (contactId: number, name: string) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${name} from emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await removeEmergencyContact(contactId);
              if (result.success) {
                Alert.alert('Success', 'Contact removed');
                await loadContacts();
              } else {
                Alert.alert('Error', result.error || 'Failed to remove contact');
              }
            } catch (error) {
              Alert.alert('Error', 'An error occurred while removing contact');
            }
          },
        },
      ]
    );
  };

  const handleSavePanicMessage = async () => {
    if (!panicMessage.trim()) {
      Alert.alert('Error', 'Please enter a panic message');
      return;
    }

    // Dismiss keyboard first
    Keyboard.dismiss();

    setIsSavingMessage(true);
    try {
      const result = await setPanicMessage(panicMessage);
      if (result.success) {
        const savedMessage = result?.data?.panicMessage || panicMessage;
        setPanicMsg(savedMessage);
        Alert.alert('Success', 'Panic message saved');
        setShowPanicMessageModal(false);
      } else {
        Alert.alert('Error', result.error || 'Failed to save panic message');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while saving panic message');
    } finally {
      setIsSavingMessage(false);
    }
  };

  const handleEditContact = (contact: EmergencyContact) => {
    handleOpenEditModal(contact);
  };

  const handleSaveEdit = async () => {

    // Prevent duplicate submissions
    if (isEditing || !editingContact) {
      return;
    }

    if (!editName.trim() || !editPhone.trim() || !editRelationship.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsEditing(true);

    try {
      const updatePayload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        relationship: editRelationship.trim(),
      };

      const result = await editEmergencyContact(editingContact.contactId, updatePayload);

      if (result.success) {
        Alert.alert('Success', 'Contact updated successfully');
        setShowEditModal(false);
        setEditingContact(null);
        setEditPhone('');
        setEditName('');
        setEditRelationship('');
        await loadContacts();
      } else {
        Alert.alert('Error', result.error || 'Failed to update contact');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while updating contact');
    } finally {
      setIsEditing(false);
    }
  };

  const renderContact = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactRelationship}>{item.relationship}</Text>
        </View>
        <Text style={styles.contactPhone}>{item.phone}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => handleEditContact(item)}
          style={styles.editButton}
        >
          <Feather name="edit-2" size={20} color="#8B5CF6" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleRemoveContact(item.contactId, item.name)}
          style={styles.deleteButton}
        >
          <Feather name="trash-2" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      <Text style={styles.sectionDescription}>
        Set up emergency contacts to notify when you trigger a panic alert
      </Text>

      {/* Panic Message Card */}
      <TouchableOpacity
        style={styles.panicMessageCard}
        onPress={handleOpenPanicMessageModal}
      >
        <View style={styles.panicMessageContent}>
          <Feather name="message-square" size={20} color="#8B5CF6" />
          <View style={styles.panicMessageText}>
            <Text style={styles.panicMessageLabel}>Custom Panic Message</Text>
            <Text style={styles.panicMessageValue} numberOfLines={1}>
              {panicMessage || 'Set a message to send to your contacts'}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#D1D5DB" />
      </TouchableOpacity>

      {/* Contacts List */}
      <View style={styles.contactsContainer}>
        <View style={styles.contactsHeader}>
          <Text style={styles.contactsTitle}>
            Contacts ({contacts.length})
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#8B5CF6"
            style={styles.loader}
          />
        ) : contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="users" size={40} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>
              No emergency contacts added yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Add contacts to notify when you trigger a panic alert
            </Text>
          </View>
        ) : (
          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.contactId.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenAddModal}
        >
          <Feather name="plus" size={20} color="#8B5CF6" />
          <Text style={styles.addButtonText}>Add Emergency Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Add Contact Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <TouchableOpacity
                style={styles.loadContactsButton}
                onPress={loadDeviceContacts}
              >
                <Feather name="smartphone" size={18} color="#8B5CF6" />
                <Text style={styles.loadContactsButtonText}>Load from Phone Contacts</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact name (e.g., Mom, Sister)"
                value={newName}
                onChangeText={setNewName}
                editable={!isAdding}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                value={newPhone}
                onChangeText={setNewPhone}
                keyboardType="phone-pad"
                editable={!isAdding}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Mother, Friend)"
                value={newRelationship}
                onChangeText={setNewRelationship}
                editable={!isAdding}
                placeholderTextColor="#9CA3AF"
              />

              <TouchableOpacity
                style={[styles.saveButton, isAdding && styles.saveButtonDisabled]}
                onPress={handleAddContact}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Add Contact</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Emergency Contact</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                ref={editNameRef}
                style={styles.input}
                placeholder="Contact name"
                value={editName}
                onChangeText={setEditName}
                editable={!isEditing}
              />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                ref={editPhoneRef}
                style={styles.input}
                placeholder="Phone number"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
                editable={!isEditing}
              />

              <Text style={styles.inputLabel}>Relationship</Text>
              <TextInput
                ref={editRelationshipRef}
                style={styles.input}
                placeholder="e.g., Sister, Mom, Friend"
                value={editRelationship}
                onChangeText={setEditRelationship}
                editable={!isEditing}
              />

              <TouchableOpacity
                style={[styles.saveButton, isEditing && styles.saveButtonDisabled]}
                onPress={handleSaveEdit}
              >
                {isEditing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Panic Message Modal */}
      <Modal visible={showPanicMessageModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Custom Panic Message</Text>
              <TouchableOpacity
                onPress={() => setShowPanicMessageModal(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.inputLabel}>Your Message</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="e.g., I'm in danger, please help me"
                value={panicMessage}
                onChangeText={setPanicMsg}
                multiline={true}
                numberOfLines={4}
                editable={!isSavingMessage}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.messageHint}>
                This message will be sent via SMS to all your emergency contacts
                when you trigger a panic alert, along with your location.
              </Text>

              <TouchableOpacity
                style={[styles.saveButton, isSavingMessage && styles.saveButtonDisabled]}
                onPress={handleSavePanicMessage}
                disabled={isSavingMessage}
              >
                {isSavingMessage ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="save" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Device Contacts Modal */}
      <Modal visible={showDeviceContacts} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Contact</Text>
              <TouchableOpacity
                onPress={() => setShowDeviceContacts(false)}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={deviceContacts}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.deviceContactItem}
                  onPress={() => handleSelectDeviceContact(item)}
                >
                  <View>
                    <Text style={styles.deviceContactName}>{item.name}</Text>
                    <Text style={styles.deviceContactPhone}>{item.phone}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#D1D5DB" />
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <Text style={styles.emptyMessage}>No contacts with phone numbers found</Text>
              )}
              style={{ paddingHorizontal: 16 }}
            />
          </View>
        </View>
      </Modal>

      <AuthGateModal
        visible={showAuthGate}
        onClose={handleAuthGateClosed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  panicMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  panicMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  panicMessageText: {
    flex: 1,
  },
  panicMessageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  panicMessageValue: {
    fontSize: 13,
    color: '#6B7280',
  },
  contactsContainer: {
    marginTop: 16,
  },
  contactsHeader: {
    marginBottom: 12,
  },
  contactsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  loader: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  contactRelationship: {
    fontSize: 12,
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  contactPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  separator: {
    height: 0,
    marginBottom: 0,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 10,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 6,
  },
  modalForm: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  messageInput: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  messageHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  loadContactsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  deviceContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  deviceContactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  deviceContactPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
});
