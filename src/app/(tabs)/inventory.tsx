import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { HeaderBar, Card, Button, StatusChip, TextField, EmptyState } from '../../components/ui';
import { ProductRepository } from '../../database/repositories/ProductRepository';
import { JarRepository } from '../../database/repositories/JarRepository';
import { Product, StockMovement, JarMovement, StockMovementReason, JarMovementType } from '../../types/domain';
import { formatINR } from '../../domain/accounting';
import { useUserStore } from '../../store/userStore';

export default function InventoryScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const { currentUser, can } = useUserStore();

  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'JARS' | 'MOVEMENTS'>('PRODUCTS');
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseEmpties, setWarehouseEmpties] = useState(0);
  const [customerJars, setCustomerJars] = useState(0);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [jarMovements, setJarMovements] = useState<JarMovement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Stock Adjustment Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState('');
  const [stockReason, setStockReason] = useState<StockMovementReason>('RESTOCK');
  const [stockNotes, setStockNotes] = useState('');
  const [showStockModal, setShowStockModal] = useState(false);

  // Jar Adjustment Modal
  const [showJarModal, setShowJarModal] = useState(false);
  const [jarQty, setJarQty] = useState('');
  const [jarReason, setJarReason] = useState<JarMovementType>('DAMAGE');
  const [jarNotes, setJarNotes] = useState('');

  // Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('Jar');
  const [newProdRate, setNewProdRate] = useState('40');
  const [newProdStock, setNewProdStock] = useState('100');
  const [newProdThreshold, setNewProdThreshold] = useState('10');
  const [newProdReturnable, setNewProdReturnable] = useState(true);

  const loadData = async () => {
    try {
      const [prods, empties, held, sMoves, jMoves] = await Promise.all([
        ProductRepository.getProducts(),
        JarRepository.getWarehouseEmptyJars(),
        JarRepository.getCustomerHeldJarsTotal(),
        ProductRepository.getStockMovements(),
        JarRepository.getJarMovements(),
      ]);
      setProducts(prods);
      setWarehouseEmpties(empties);
      setCustomerJars(held);
      setStockMovements(sMoves);
      setJarMovements(jMoves);
    } catch (e) {
      console.error('Error fetching inventory data', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return;
    const qty = parseInt(stockDelta, 10);
    if (isNaN(qty) || qty === 0) {
      Alert.alert('Validation', 'Please enter a valid non-zero quantity');
      return;
    }

    try {
      const delta = stockReason === 'RESTOCK' ? Math.abs(qty) : -Math.abs(qty);
      await ProductRepository.adjustStock({
        productId: selectedProduct.id,
        delta,
        reason: stockReason,
        notes: stockNotes,
        userId: currentUser.id,
      });

      setShowStockModal(false);
      setStockDelta('');
      setStockNotes('');
      await loadData();
      Alert.alert('Success', 'Stock successfully adjusted!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to adjust stock');
    }
  };

  const handleJarAdjustment = async () => {
    const qty = parseInt(jarQty, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation', 'Please enter a valid positive jar quantity');
      return;
    }

    try {
      await JarRepository.recordJarAdjustment({
        movementType: jarReason,
        quantity: qty,
        notes: jarNotes || `${jarReason} adjustment`,
        userId: currentUser.id,
      });

      setShowJarModal(false);
      setJarQty('');
      setJarNotes('');
      await loadData();
      Alert.alert('Success', 'Jar adjustment recorded!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record jar adjustment');
    }
  };

  const handleCreateProduct = async () => {
    if (!newProdName.trim()) {
      Alert.alert('Validation', 'Product name is required');
      return;
    }

    const rateMinor = Math.round(parseFloat(newProdRate || '0') * 100);
    const stock = parseInt(newProdStock || '0', 10);
    const threshold = parseInt(newProdThreshold || '10', 10);

    try {
      await ProductRepository.createProduct({
        name: newProdName.trim(),
        unit: newProdUnit,
        current_rate_minor: rateMinor,
        stock_quantity: stock,
        low_stock_threshold: threshold,
        is_returnable: newProdReturnable ? 1 : 0,
      });

      setShowAddProductModal(false);
      setNewProdName('');
      await loadData();
      Alert.alert('Success', 'Product successfully added!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add product');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar
        title={t('navInventory')}
        subtitle="Catalog & Jars"
        rightAction={
          can('PRODUCT_MANAGE') ? (
            <TouchableOpacity
              onPress={() => setShowAddProductModal(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel="Add Product"
            >
              <Ionicons name="add" size={20} color={colors.onPrimary} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Segmented Tab Switcher */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('PRODUCTS')}
          style={[
            styles.tabItem,
            activeTab === 'PRODUCTS' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: activeTab === 'PRODUCTS' ? colors.primary : colors.onSurfaceVariant, fontWeight: 'bold' },
            ]}
          >
            {t('productCatalog')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('JARS')}
          style={[
            styles.tabItem,
            activeTab === 'JARS' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: activeTab === 'JARS' ? colors.primary : colors.onSurfaceVariant, fontWeight: 'bold' },
            ]}
          >
            {t('jarCirculation')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('MOVEMENTS')}
          style={[
            styles.tabItem,
            activeTab === 'MOVEMENTS' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: activeTab === 'MOVEMENTS' ? colors.primary : colors.onSurfaceVariant, fontWeight: 'bold' },
            ]}
          >
            {t('stockMovements')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PRODUCTS TAB */}
      {activeTab === 'PRODUCTS' && (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { padding: spacing.space4 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const isLow = item.stock_quantity <= item.low_stock_threshold;
            return (
              <Card style={{ marginVertical: 6 }}>
                <View style={styles.productHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                      {item.name}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                      Unit: {item.unit} {item.is_returnable ? '• Returnable Jar' : ''}
                    </Text>
                  </View>

                  <StatusChip
                    status={isLow ? 'low_stock' : 'active'}
                    label={isLow ? 'Low Stock' : 'In Stock'}
                  />
                </View>

                <View style={[styles.productDetailsRow, { borderTopColor: colors.outlineVariant, marginTop: spacing.space2, paddingTop: spacing.space2 }]}>
                  <View>
                    <Text style={[typography.bodySmall, { color: colors.outline }]}>
                      Selling Rate
                    </Text>
                    <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: 'bold' }]}>
                      {formatINR(item.current_rate_minor)}
                    </Text>
                  </View>

                  <View>
                    <Text style={[typography.bodySmall, { color: colors.outline }]}>
                      Available Stock
                    </Text>
                    <Text
                      style={[
                        typography.titleSmall,
                        { color: isLow ? colors.error : colors.onSurface, fontWeight: 'bold' },
                      ]}
                    >
                      {item.stock_quantity} {item.unit}s
                    </Text>
                  </View>

                  {can('STOCK_ADJUSTMENT') && (
                    <Button
                      title={t('adjustStock')}
                      variant="tonal"
                      onPress={() => {
                        setSelectedProduct(item);
                        setShowStockModal(true);
                      }}
                      style={{ paddingVertical: 6, paddingHorizontal: 12, minHeight: 36 }}
                    />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* JARS TAB */}
      {activeTab === 'JARS' && (
        <ScrollView
          contentContainerStyle={[styles.listContent, { padding: spacing.space4 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Top KPI Cards */}
          <View style={styles.jarMetricsRow}>
            <Card style={{ flex: 1, marginRight: 6, backgroundColor: colors.surfaceContainerLow }}>
              <Text style={[typography.labelSmall, { color: colors.outline }]}>
                {t('warehouseJars')}
              </Text>
              <Text style={[typography.headlineMedium, { color: colors.secondary, fontWeight: 'bold', marginVertical: 4 }]}>
                {warehouseEmpties}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                Ready for refill
              </Text>
            </Card>

            <Card style={{ flex: 1, marginLeft: 6, backgroundColor: colors.surfaceContainerLow }}>
              <Text style={[typography.labelSmall, { color: colors.outline }]}>
                {t('customerHeldJars')}
              </Text>
              <Text style={[typography.headlineMedium, { color: colors.primary, fontWeight: 'bold', marginVertical: 4 }]}>
                {customerJars}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                In customer circulation
              </Text>
            </Card>
          </View>

          {can('JAR_AUDIT_ADJUSTMENT') && (
            <Button
              title={t('adjustJars')}
              icon={<Ionicons name="build" size={18} color={colors.onPrimary} />}
              onPress={() => setShowJarModal(true)}
              style={{ marginVertical: spacing.space3 }}
            />
          )}

          {/* Recent Jar Movements Log */}
          <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginTop: spacing.space3, marginBottom: spacing.space2 }]}>
            Recent Jar Movements
          </Text>

          {jarMovements.length === 0 ? (
            <EmptyState title="No jar movements recorded yet" />
          ) : (
            jarMovements.map((jm) => (
              <Card key={jm.id} style={{ marginVertical: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                      {jm.movement_type} ({jm.quantity} Jars)
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                      {jm.timestamp.split('T')[0]} {jm.customer_name ? `• ${jm.customer_name}` : ''}
                    </Text>
                    {jm.notes ? (
                      <Text style={[typography.bodySmall, { color: colors.outline }]}>
                        Reason: {jm.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}

      {/* MOVEMENTS TAB */}
      {activeTab === 'MOVEMENTS' && (
        <FlatList
          data={stockMovements}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { padding: spacing.space4 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState title="No stock movements recorded yet" />}
          renderItem={({ item }) => (
            <Card style={{ marginVertical: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {item.product_name}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                    {item.reason} • {item.timestamp.split('T')[0]}
                  </Text>
                  {item.notes ? (
                    <Text style={[typography.bodySmall, { color: colors.outline }]}>
                      {item.notes}
                    </Text>
                  ) : null}
                </View>

                <Text
                  style={[
                    typography.titleMedium,
                    {
                      color: item.delta > 0 ? colors.success : colors.error,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {item.delta > 0 ? `+${item.delta}` : item.delta}
                </Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* Stock Adjustment Modal */}
      <Modal visible={showStockModal} transparent animationType="slide" onRequestClose={() => setShowStockModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, padding: spacing.space5, borderRadius: 16 }]}>
            <Text style={[typography.titleLarge, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
              {t('adjustStock')}: {selectedProduct?.name}
            </Text>

            <View style={{ flexDirection: 'row', marginVertical: 8 }}>
              {(['RESTOCK', 'DAMAGE', 'AUDIT_CORRECTION'] as StockMovementReason[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setStockReason(r)}
                  style={[
                    styles.radioBtn,
                    {
                      backgroundColor: stockReason === r ? colors.primary : colors.surfaceContainer,
                      marginRight: 6,
                    },
                  ]}
                >
                  <Text style={[typography.labelSmall, { color: stockReason === r ? colors.onPrimary : colors.onSurface }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextField
              label={t('adjustmentQuantity')}
              placeholder="e.g. 50"
              keyboardType="number-pad"
              value={stockDelta}
              onChangeText={setStockDelta}
            />

            <TextField
              label={t('adjustmentReason')}
              placeholder="Mandatory notes for audit"
              value={stockNotes}
              onChangeText={setStockNotes}
            />

            <View style={styles.modalActions}>
              <Button title={t('cancel')} variant="outlined" onPress={() => setShowStockModal(false)} style={{ flex: 1, marginRight: 6 }} />
              <Button title={t('save')} onPress={handleStockAdjustment} style={{ flex: 1, marginLeft: 6 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Jar Adjustment Modal */}
      <Modal visible={showJarModal} transparent animationType="slide" onRequestClose={() => setShowJarModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, padding: spacing.space5, borderRadius: 16 }]}>
            <Text style={[typography.titleLarge, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
              {t('adjustJars')}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 }}>
              {(['DAMAGE', 'LOST', 'WRITE_OFF', 'AUDIT_ADJUSTMENT'] as JarMovementType[]).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setJarReason(r)}
                  style={[
                    styles.radioBtn,
                    {
                      backgroundColor: jarReason === r ? colors.primary : colors.surfaceContainer,
                      marginRight: 6,
                      marginBottom: 6,
                    },
                  ]}
                >
                  <Text style={[typography.labelSmall, { color: jarReason === r ? colors.onPrimary : colors.onSurface }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextField
              label={t('adjustmentQuantity')}
              placeholder="e.g. 2"
              keyboardType="number-pad"
              value={jarQty}
              onChangeText={setJarQty}
            />

            <TextField
              label={t('adjustmentReason')}
              placeholder="Reason for damage/loss/write-off"
              value={jarNotes}
              onChangeText={setJarNotes}
            />

            <View style={styles.modalActions}>
              <Button title={t('cancel')} variant="outlined" onPress={() => setShowJarModal(false)} style={{ flex: 1, marginRight: 6 }} />
              <Button title={t('save')} onPress={handleJarAdjustment} style={{ flex: 1, marginLeft: 6 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={showAddProductModal} transparent animationType="slide" onRequestClose={() => setShowAddProductModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, padding: spacing.space5, borderRadius: 16 }]}>
            <Text style={[typography.titleLarge, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 12 }]}>
              {t('addProduct')}
            </Text>

            <TextField label={t('productName')} placeholder="e.g. 20L Water Jar" value={newProdName} onChangeText={setNewProdName} />
            <TextField label={t('unit')} placeholder="e.g. Jar, Box, Bottle" value={newProdUnit} onChangeText={setNewProdUnit} />
            <TextField label={t('sellingRate')} placeholder="e.g. 40" keyboardType="numeric" value={newProdRate} onChangeText={setNewProdRate} />
            <TextField label={t('stockQuantity')} placeholder="e.g. 150" keyboardType="number-pad" value={newProdStock} onChangeText={setNewProdStock} />
            <TextField label={t('lowStockThreshold')} placeholder="e.g. 20" keyboardType="number-pad" value={newProdThreshold} onChangeText={setNewProdThreshold} />

            <TouchableOpacity
              onPress={() => setNewProdReturnable(!newProdReturnable)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
            >
              <Ionicons
                name={newProdReturnable ? 'checkbox' : 'square-outline'}
                size={22}
                color={colors.primary}
              />
              <Text style={[typography.bodyMedium, { color: colors.onSurface, marginLeft: 8 }]}>
                {t('returnableContainer')}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <Button title={t('cancel')} variant="outlined" onPress={() => setShowAddProductModal(false)} style={{ flex: 1, marginRight: 6 }} />
              <Button title={t('save')} onPress={handleCreateProduct} style={{ flex: 1, marginLeft: 6 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  addBtn: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  jarMetricsRow: {
    flexDirection: 'row',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    elevation: 8,
  },
  radioBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
});
