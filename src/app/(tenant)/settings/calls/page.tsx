"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { SipConfigForm } from "@/components/calls/SipConfigForm";
import { SipConfigList } from "@/components/calls/SipConfigList";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Plus, Zap } from "lucide-react";
import {
  sipConfigurationsList,
  sipConfigurationsCreate,
  sipConfigurationsUpdate,
  sipConfigurationsDestroy,
  sipConfigurationsSetDefaultCreate,
  sipConfigurationsTestConnectionCreate,
  sipConfigurationsRetrieve,
} from "@/api/generated/api";
import type {
  SipConfigurationList,
  SipConfigurationDetail,
  SipConfiguration,
} from "@/api/generated/interfaces";
import { useToast } from "@/hooks/use-toast";

export default function CallSettingsPage() {
  const t = useTranslations("calls");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const [sipConfigs, setSipConfigs] = useState<SipConfigurationList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<SipConfigurationDetail | null>(null);
  const [configForm, setConfigForm] = useState<
    Partial<SipConfigurationDetail>
  >({
    name: "",
    sip_server: "",
    sip_port: 5060,
    username: "",
    password: "",
    realm: "",
    proxy: "",
    stun_server: "",
    turn_server: "",
    turn_username: "",
    turn_password: "",
    is_active: true,
    is_default: false,
    max_concurrent_calls: 5,
  });
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSipConfigs();
  }, []);

  const fetchSipConfigs = async () => {
    try {
      setLoading(true);
      const response = await sipConfigurationsList();
      setSipConfigs(response.results);
      setError("");
    } catch (err: unknown) {
      console.error("Failed to fetch SIP configs:", err);
      setError("Failed to load SIP configurations");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (config?: SipConfigurationList) => {
    if (config) {
      loadConfigForEdit(config.id);
    } else {
      setEditingConfig(null);
      setConfigForm({
        name: "",
        sip_server: "",
        sip_port: 5060,
        username: "",
        realm: "",
        proxy: "",
        stun_server: "",
        turn_server: "",
        turn_username: "",
        is_active: true,
        is_default: false,
        max_concurrent_calls: 5,
      });
    }
    setShowModal(true);
  };

  const loadConfigForEdit = async (configId: number) => {
    try {
      const config = await sipConfigurationsRetrieve(configId);
      setEditingConfig(config);
      setConfigForm({
        name: config.name,
        sip_server: config.sip_server,
        sip_port: config.sip_port,
        username: config.username,
        password: "",
        realm: config.realm || "",
        proxy: config.proxy || "",
        stun_server: config.stun_server || "",
        turn_server: config.turn_server || "",
        turn_username: config.turn_username || "",
      });
      setShowModal(true);
    } catch (error) {
      console.error("Error loading SIP configuration:", error);
      toast({
        title: "Error",
        description: "Failed to load SIP configuration",
        variant: "destructive",
      });
    }
  };

  const setupAsteriskServer = () => {
    setEditingConfig(null);
    setConfigForm({
      name: "EchoDesk Asterisk Server",
      sip_server: "165.227.166.42",
      sip_port: 8089,
      username: "1001",
      password: "Giorgi123.",
      realm: "165.227.166.42",
      proxy: "",
      stun_server: "stun:stun.l.google.com:19302",
      turn_server: "",
      turn_username: "",
      turn_password: "",
      is_active: true,
      is_default: true,
      max_concurrent_calls: 5,
    });
    setShowModal(true);
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      const { password, turn_password, ...apiConfig } = configForm;

      if (editingConfig) {
        await sipConfigurationsUpdate(editingConfig.id, configForm as any);
        toast({
          title: "Success",
          description: "SIP configuration updated successfully",
        });
      } else {
        const createData = {
          ...apiConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          id: 0,
        } as SipConfiguration;
        await sipConfigurationsCreate(createData);
        toast({
          title: "Success",
          description: "SIP configuration created successfully",
        });
      }

      await fetchSipConfigs();
      setShowModal(false);
      setError("");
    } catch (err: unknown) {
      console.error("Failed to save SIP config:", err);
      toast({
        title: "Error",
        description: "Failed to save SIP configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (configId: number) => {
    if (!confirm("Are you sure you want to delete this SIP configuration?")) {
      return;
    }

    try {
      setActionLoading(configId);
      await sipConfigurationsDestroy(configId);
      await fetchSipConfigs();
      setError("");
      toast({
        title: "Success",
        description: "SIP configuration deleted successfully",
      });
    } catch (err: unknown) {
      console.error("Failed to delete SIP config:", err);
      toast({
        title: "Error",
        description: "Failed to delete SIP configuration",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const setDefaultConfig = async (configId: number) => {
    try {
      setActionLoading(configId);
      const config = await sipConfigurationsRetrieve(configId);
      await sipConfigurationsSetDefaultCreate(configId, config as any);
      await fetchSipConfigs();
      setError("");
      toast({
        title: "Success",
        description: "Default SIP configuration updated",
      });
    } catch (err: unknown) {
      console.error("Failed to set default SIP config:", err);
      toast({
        title: "Error",
        description: "Failed to set default SIP configuration",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const testConnection = async (config: SipConfigurationList) => {
    try {
      setActionLoading(config.id);
      const fullConfig = await sipConfigurationsRetrieve(config.id);
      const result = await sipConfigurationsTestConnectionCreate(
        config.id,
        fullConfig as any
      );
      toast({
        title: result.success ? "Connection Successful" : "Connection Failed",
        description: result.message || "",
        variant: result.success ? "default" : "destructive",
      });
    } catch (err: unknown) {
      console.error("Failed to test SIP config:", err);
      toast({
        title: "Error",
        description: "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const updateFormField = (field: string, value: any) => {
    setConfigForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <FeatureGate feature="ip_calling" showUpgrade={true}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
            <p className="text-muted-foreground">
              {t("settings.subtitle")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={setupAsteriskServer}>
              <Zap className="h-4 w-4 mr-2" />
              {t("settings.quickSetup")}
            </Button>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              {t("settings.addConfiguration")}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                {tCommon("loading")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <SipConfigList
            configs={sipConfigs}
            onEdit={openModal}
            onDelete={deleteConfig}
            onSetDefault={setDefaultConfig}
            onTest={testConnection}
            actionLoading={actionLoading}
          />
        )}

        {/* Configuration Modal */}
        <SipConfigForm
          open={showModal}
          onClose={() => setShowModal(false)}
          onSave={saveConfig}
          configForm={configForm}
          updateFormField={updateFormField}
          editingConfig={editingConfig}
          saving={saving}
        />
      </div>
    </FeatureGate>
  );
}
