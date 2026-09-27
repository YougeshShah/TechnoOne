import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { precedentApi, CreatePrecedentPayload, UpdatePrecedentPayload } from "../api/precedent.api";

export function usePrecedentSearch(params: { search?: string; category?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["precedents", params],
    queryFn: () => precedentApi.search(params),
    placeholderData: (prev) => prev,
  });
}

export function usePrecedentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["precedent-detail", id],
    queryFn: () => precedentApi.getById(id as string),
    enabled: !!id,
  });
}

export function usePrecedentCategories() {
  return useQuery({ queryKey: ["precedent-categories"], queryFn: () => precedentApi.listCategories() });
}

export function useCreatePrecedent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePrecedentPayload) => precedentApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["precedents"] });
      qc.invalidateQueries({ queryKey: ["precedent-categories"] });
    },
  });
}

export function useUpdatePrecedent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePrecedentPayload }) => precedentApi.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["precedents"] });
      qc.invalidateQueries({ queryKey: ["precedent-detail", id] });
    },
  });
}

export function useDeletePrecedent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => precedentApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["precedents"] }),
  });
}
