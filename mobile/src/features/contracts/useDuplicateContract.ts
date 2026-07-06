import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useSettings } from '@/store/settings';
import { useContracts } from './useContracts';
import { useSaveContract } from './useSaveContract';
import { buildAutoOrder } from './form';
import { newId } from '@/data/writes';
import { arr } from '@/lib/guard';
import { Contract } from '@/data/types';

// Confirm-and-duplicate a contract: clones products with fresh ids, clears
// invoices/stock/payments, assigns a new auto PO number, then opens the copy.
// Shared by the contract detail screen and the list swipe action (web parity).
export function useDuplicateContract() {
  const { settings } = useSettings();
  const { data: contracts } = useContracts();
  const save = useSaveContract();

  const duplicate = (contract: Contract) => {
    Alert.alert('Duplicate contract?', 'Creates a new draft with the same products and terms.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          const supName =
            settings?.Supplier?.Supplier?.find((s: any) => s.id === contract.supplier)?.supplier || null;
          const dup: Contract = {
            ...contract,
            id: '',
            invoices: [],
            poInvoices: [],
            stock: [],
            expenses: [],
            order: buildAutoOrder(contracts || [], supName),
            productsData: arr<any>(contract.productsData).map((p) => ({ ...p, id: newId() })),
          };
          try {
            const res = await save.mutateAsync({ value: dup, existing: undefined });
            router.push(`/(app)/contracts/${res.contract.id}`);
          } catch (e: any) {
            Alert.alert('Failed', e?.message || 'Could not duplicate.');
          }
        },
      },
    ]);
  };

  return { duplicate, isPending: save.isPending };
}
