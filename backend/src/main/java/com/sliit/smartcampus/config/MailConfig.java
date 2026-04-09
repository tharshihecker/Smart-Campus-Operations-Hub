package com.sliit.smartcampus.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {

    private final Environment env;

    public MailConfig(Environment env) {
        this.env = env;
    }

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        String host = env.getProperty("spring.mail.host");
        if (host != null) impl.setHost(host);
        String port = env.getProperty("spring.mail.port");
        if (port != null) {
            try { impl.setPort(Integer.parseInt(port)); } catch (NumberFormatException ignored) {}
        }
        String user = env.getProperty("spring.mail.username");
        if (user != null) impl.setUsername(user);
        String pass = env.getProperty("spring.mail.password");
        if (pass != null) impl.setPassword(pass);

        Properties props = impl.getJavaMailProperties();
        props.put("mail.transport.protocol", env.getProperty("spring.mail.protocol", "smtp"));
        props.put("mail.smtp.auth", env.getProperty("spring.mail.properties.mail.smtp.auth", "false"));
        props.put("mail.smtp.starttls.enable", env.getProperty("spring.mail.properties.mail.smtp.starttls.enable", "false"));
        props.put("mail.debug", env.getProperty("spring.mail.properties.mail.debug", "false"));

        return impl;
    }
}
